-- =====================================================================
-- MediBook – Smart Healthcare Appointment Booking System
-- Supabase / PostgreSQL schema, security (RLS) and server-side logic
-- Run this whole file in the Supabase SQL Editor, then run seed.sql
-- =====================================================================

create extension if not exists pgcrypto;

-- Clinic time zone used to decide "today" and which slots are in the past.
create or replace function public.clinic_now()
returns timestamp language sql stable as $$
  select (now() at time zone 'Asia/Dhaka');
$$;

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 2 and 100),
  email       text not null unique,
  phone       text check (phone is null or phone ~ '^[+0-9 ()-]{7,20}$'),
  role        text not null default 'patient' check (role in ('patient','admin')),
  created_at  timestamptz not null default now()
);

create table if not exists public.specializations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 2 and 60),
  description text
);

create table if not exists public.doctors (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null check (char_length(full_name) between 3 and 100),
  specialization   text not null references public.specializations(name)
                     on update cascade on delete restrict,
  profile_image    text,
  experience       int  not null default 0 check (experience between 0 and 60),
  consultation_fee numeric(10,2) not null default 0 check (consultation_fee >= 0),
  biography        text,
  specialties      text[] not null default '{}',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists doctors_specialization_idx on public.doctors(specialization);

-- One row = one working window (is_available = true)
--        or one blocked window (is_available = false) on a specific date.
create table if not exists public.doctor_availability (
  id             uuid primary key default gen_random_uuid(),
  doctor_id      uuid not null references public.doctors(id) on delete cascade,
  available_date date not null,
  start_time     time not null,
  end_time       time not null,
  slot_duration  int  not null default 30 check (slot_duration in (10,15,20,30,45,60,90,120)),
  is_available   boolean not null default true,
  created_at     timestamptz not null default now(),
  check (end_time > start_time)
);
create index if not exists availability_doctor_date_idx
  on public.doctor_availability(doctor_id, available_date);

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references public.profiles(id) on delete cascade,
  doctor_id        uuid not null references public.doctors(id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  patient_concerns text check (patient_concerns is null or char_length(patient_concerns) <= 1000),
  status           text not null default 'pending'
                     check (status in ('pending','confirmed','cancelled','completed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists appointments_patient_idx on public.appointments(patient_id, appointment_date);
create index if not exists appointments_doctor_date_idx on public.appointments(doctor_id, appointment_date);
create index if not exists appointments_status_idx on public.appointments(status);

-- *** DUPLICATE-SLOT PROTECTION (database level) ***
-- A doctor can only hold ONE active (pending/confirmed/completed) appointment per date+time.
-- Cancelled appointments free the slot again.
create unique index if not exists appointments_unique_active_slot
  on public.appointments(doctor_id, appointment_date, appointment_time)
  where status <> 'cancelled';

-- A patient cannot be in two places at once either.
create unique index if not exists appointments_unique_patient_slot
  on public.appointments(patient_id, appointment_date, appointment_time)
  where status <> 'cancelled';

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references public.doctors(id) on delete cascade,
  patient_id  uuid references public.profiles(id) on delete set null,
  patient_name text not null,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);
create index if not exists reviews_doctor_idx on public.reviews(doctor_id);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Create a profile automatically for every new auth user (role is ALWAYS patient).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.email,
    nullif(new.raw_user_meta_data->>'phone',''),
    'patient'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Patients may edit their name/phone but never their role or email.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role  := old.role;
    new.email := old.email;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists appointments_touch on public.appointments;
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- Notify patients when appointments are created or their status changes.
create or replace function public.notify_appointment_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_doc text;
  v_when text;
begin
  select full_name into v_doc from public.doctors where id = new.doctor_id;
  v_when := to_char(new.appointment_date, 'Dy, DD Mon YYYY') || ' at ' || to_char(new.appointment_time, 'HH12:MI AM');

  if tg_op = 'INSERT' then
    insert into public.notifications(user_id, title, message)
    values (new.patient_id, 'Appointment booked',
      'Your appointment #' || upper(left(new.id::text, 8)) || ' with ' || v_doc || ' on ' || v_when || ' is pending confirmation.');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.notifications(user_id, title, message)
    values (new.patient_id, 'Appointment ' || new.status,
      'Your appointment #' || upper(left(new.id::text, 8)) || ' with ' || v_doc || ' on ' || v_when || ' is now ' || new.status || '.');
  end if;
  return new;
end $$;

drop trigger if exists appointments_notify on public.appointments;
create trigger appointments_notify after insert or update on public.appointments
  for each row execute function public.notify_appointment_change();

-- ---------------------------------------------------------------------
-- 3. AVAILABILITY / BOOKING LOGIC (all validation happens here, server side)
-- ---------------------------------------------------------------------

-- Every slot for a doctor on a date, with its state.
create or replace function public.get_doctor_slots(p_doctor_id uuid, p_date date)
returns table (slot_time time, is_booked boolean, is_past boolean, is_available boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamp := public.clinic_now();
begin
  return query
  with windows as (
    select a.start_time, a.end_time, a.slot_duration
    from public.doctor_availability a
    where a.doctor_id = p_doctor_id and a.available_date = p_date and a.is_available
  ),
  slots as (
    select distinct gs::time as t
    from windows w,
      generate_series(
        p_date + w.start_time,
        p_date + w.end_time - make_interval(mins => w.slot_duration),
        make_interval(mins => w.slot_duration)
      ) gs
  ),
  blocked as (
    select b.start_time, b.end_time
    from public.doctor_availability b
    where b.doctor_id = p_doctor_id and b.available_date = p_date and not b.is_available
  )
  select
    s.t,
    exists (select 1 from public.appointments ap
            where ap.doctor_id = p_doctor_id and ap.appointment_date = p_date
              and ap.appointment_time = s.t and ap.status <> 'cancelled'),
    (p_date + s.t) <= v_now,
    not exists (select 1 from blocked b where s.t >= b.start_time and s.t < b.end_time)
  from slots s
  where exists (select 1 from public.doctors d where d.id = p_doctor_id and d.is_active)
  order by s.t;
end $$;

-- Dates in a range that have at least one free, bookable slot.
create or replace function public.get_doctor_available_dates(p_doctor_id uuid, p_from date, p_to date)
returns table (available_date date, free_slots int)
language sql stable security definer set search_path = public as $$
  select d::date, count(*)::int
  from generate_series(p_from, p_to, interval '1 day') d
  cross join lateral public.get_doctor_slots(p_doctor_id, d::date) s
  where not s.is_booked and not s.is_past and s.is_available
  group by d
  order by d;
$$;

-- *** ATOMIC BOOKING ***
-- Patients cannot INSERT into appointments directly (no RLS insert policy for them);
-- they must go through this function, which validates everything and serialises
-- concurrent attempts on the same slot with a transaction-scoped advisory lock.
create or replace function public.book_appointment(
  p_doctor_id uuid, p_date date, p_time time, p_concerns text default null
) returns public.appointments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_slot record;
  v_row public.appointments;
begin
  if v_uid is null then
    raise exception 'You must be logged in to book an appointment.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Patient profile not found.';
  end if;
  if p_concerns is not null and char_length(p_concerns) > 1000 then
    raise exception 'Patient concerns must be 1000 characters or fewer.';
  end if;

  -- Serialise all attempts for this doctor/date/time (race-condition protection)
  perform pg_advisory_xact_lock(hashtextextended(p_doctor_id::text || p_date::text || p_time::text, 0));

  select * into v_slot from public.get_doctor_slots(p_doctor_id, p_date) s where s.slot_time = p_time;

  if not found then
    raise exception 'This time is not part of the doctor''s schedule.' using errcode = 'P0001';
  elsif v_slot.is_past then
    raise exception 'This time slot is in the past.' using errcode = 'P0001';
  elsif not v_slot.is_available then
    raise exception 'The doctor is unavailable at this time.' using errcode = 'P0001';
  elsif v_slot.is_booked then
    raise exception 'SLOT_TAKEN: This slot has already been booked. Please choose another time.' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments (patient_id, doctor_id, appointment_date, appointment_time, patient_concerns, status)
    values (v_uid, p_doctor_id, p_date, p_time, nullif(trim(p_concerns), ''), 'pending')
    returning * into v_row;
  exception when unique_violation then
    if exists (select 1 from public.appointments where patient_id = v_uid and appointment_date = p_date
               and appointment_time = p_time and status <> 'cancelled') then
      raise exception 'You already have another appointment at this date and time.' using errcode = 'P0001';
    end if;
    raise exception 'SLOT_TAKEN: This slot has already been booked. Please choose another time.' using errcode = 'P0001';
  end;

  return v_row;
end $$;

-- Patients cancel their own pending/confirmed future appointments.
create or replace function public.cancel_appointment(p_id uuid)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare v_row public.appointments;
begin
  select * into v_row from public.appointments where id = p_id for update;
  if not found then raise exception 'Appointment not found.'; end if;
  if v_row.patient_id <> auth.uid() and not public.is_admin() then
    raise exception 'You can only cancel your own appointments.' using errcode = '42501';
  end if;
  if v_row.status not in ('pending','confirmed') then
    raise exception 'Only pending or confirmed appointments can be cancelled.';
  end if;
  if (v_row.appointment_date + v_row.appointment_time) <= public.clinic_now() and not public.is_admin() then
    raise exception 'Past appointments cannot be cancelled.';
  end if;
  update public.appointments set status = 'cancelled' where id = p_id returning * into v_row;
  return v_row;
end $$;

-- Admin status changes (re-activating a cancelled booking is still guarded by the unique index).
create or replace function public.admin_set_appointment_status(p_id uuid, p_status text)
returns public.appointments
language plpgsql security definer set search_path = public as $$
declare v_row public.appointments;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_status not in ('pending','confirmed','cancelled','completed') then
    raise exception 'Invalid status.';
  end if;
  begin
    update public.appointments set status = p_status where id = p_id returning * into v_row;
  exception when unique_violation then
    raise exception 'SLOT_TAKEN: Another active appointment already holds this slot.';
  end;
  if not found then raise exception 'Appointment not found.'; end if;
  return v_row;
end $$;

-- ---------------------------------------------------------------------
-- 4. RECOMMENDATIONS (bonus) – rule-based ranking
-- ---------------------------------------------------------------------
create or replace function public.recommend_doctors(p_specialization text, p_days int default 14)
returns table (
  doctor_id uuid, full_name text, specialization text, profile_image text,
  experience int, consultation_fee numeric, avg_rating numeric,
  next_date date, next_time time, free_slots int, score numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := public.clinic_now()::date;
begin
  return query
  with docs as (
    select d.* from public.doctors d
    where d.is_active and (p_specialization is null or p_specialization = '' or d.specialization = p_specialization)
  ),
  avail as (
    select dc.id as did, ad.available_date, ad.free_slots
    from docs dc
    cross join lateral public.get_doctor_available_dates(dc.id, v_today, v_today + greatest(p_days,1)) ad
  ),
  firstday as (
    select distinct on (a.did) a.did, a.available_date, sum(a.free_slots) over (partition by a.did) as total_free
    from avail a order by a.did, a.available_date
  ),
  firstslot as (
    select f.did, f.available_date, f.total_free,
      (select s.slot_time from public.get_doctor_slots(f.did, f.available_date) s
        where not s.is_booked and not s.is_past and s.is_available order by s.slot_time limit 1) as t
    from firstday f
  ),
  ratings as (
    select r.doctor_id as did, round(avg(r.rating)::numeric, 1) as avg_rating from public.reviews r group by r.doctor_id
  )
  select dc.id, dc.full_name, dc.specialization, dc.profile_image, dc.experience, dc.consultation_fee,
         coalesce(rt.avg_rating, 0),
         fs.available_date, fs.t, coalesce(fs.total_free, 0)::int,
         round((
           case when fs.did is not null then 100 else 0 end                         -- has availability
           + case when fs.did is not null then greatest(0, 40 - (fs.available_date - v_today) * 4) else 0 end -- sooner is better
           + least(dc.experience, 30)                                                  -- experience (cap 30)
           + coalesce(rt.avg_rating, 0) * 4                                            -- patient ratings
           + least(coalesce(fs.total_free, 0), 20) * 0.5                               -- more open slots
         )::numeric, 1)
  from docs dc
  left join firstslot fs on fs.did = dc.id
  left join ratings rt on rt.did = dc.id
  order by (fs.did is not null) desc, fs.available_date asc nulls last, fs.t asc nulls last, dc.experience desc;
end $$;

-- ---------------------------------------------------------------------
-- 5. STATISTICS (admin)
-- ---------------------------------------------------------------------
create or replace function public.get_daily_stats(p_from date, p_to date)
returns table (day date, total int, pending int, confirmed int, cancelled int, completed int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  return query
  select d::date,
    count(a.id)::int,
    count(a.id) filter (where a.status = 'pending')::int,
    count(a.id) filter (where a.status = 'confirmed')::int,
    count(a.id) filter (where a.status = 'cancelled')::int,
    count(a.id) filter (where a.status = 'completed')::int
  from generate_series(p_from, p_to, interval '1 day') d
  left join public.appointments a on a.appointment_date = d::date
  group by d order by d;
end $$;

create or replace function public.get_admin_summary()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  return json_build_object(
    'doctors',   (select count(*) from public.doctors),
    'patients',  (select count(*) from public.profiles where role = 'patient'),
    'appointments', (select count(*) from public.appointments),
    'pending',   (select count(*) from public.appointments where status = 'pending'),
    'confirmed', (select count(*) from public.appointments where status = 'confirmed'),
    'cancelled', (select count(*) from public.appointments where status = 'cancelled'),
    'completed', (select count(*) from public.appointments where status = 'completed'),
    'today',     (select count(*) from public.appointments where appointment_date = public.clinic_now()::date)
  );
end $$;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.specializations     enable row level security;
alter table public.doctors             enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.appointments        enable row level security;
alter table public.reviews             enable row level security;
alter table public.notifications       enable row level security;

-- profiles
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: admin delete" on public.profiles;
create policy "profiles: admin delete" on public.profiles for delete using (public.is_admin());

-- specializations / doctors / availability / reviews: public read, admin write
drop policy if exists "spec: read" on public.specializations;
create policy "spec: read" on public.specializations for select using (true);
drop policy if exists "spec: admin write" on public.specializations;
create policy "spec: admin write" on public.specializations for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "doctors: read" on public.doctors;
create policy "doctors: read" on public.doctors for select using (true);
drop policy if exists "doctors: admin write" on public.doctors;
create policy "doctors: admin write" on public.doctors for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "availability: read" on public.doctor_availability;
create policy "availability: read" on public.doctor_availability for select using (true);
drop policy if exists "availability: admin write" on public.doctor_availability;
create policy "availability: admin write" on public.doctor_availability for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reviews: read" on public.reviews;
create policy "reviews: read" on public.reviews for select using (true);
drop policy if exists "reviews: patient insert own" on public.reviews;
create policy "reviews: patient insert own" on public.reviews for insert
  with check (patient_id = auth.uid() and exists (
    select 1 from public.appointments a where a.patient_id = auth.uid()
      and a.doctor_id = reviews.doctor_id and a.status = 'completed'));
drop policy if exists "reviews: admin manage" on public.reviews;
create policy "reviews: admin manage" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- appointments: patients read only their own; writes go through RPCs; admins manage all
drop policy if exists "appointments: read own or admin" on public.appointments;
create policy "appointments: read own or admin" on public.appointments
  for select using (patient_id = auth.uid() or public.is_admin());
drop policy if exists "appointments: admin write" on public.appointments;
create policy "appointments: admin write" on public.appointments
  for all using (public.is_admin()) with check (public.is_admin());

-- notifications: own only
drop policy if exists "notifications: own" on public.notifications;
create policy "notifications: own" on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists "notifications: mark read" on public.notifications;
create policy "notifications: mark read" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notifications: delete own" on public.notifications;
create policy "notifications: delete own" on public.notifications
  for delete using (user_id = auth.uid());

-- Function permissions
revoke all on function public.book_appointment(uuid,date,time,text) from public, anon;
grant execute on function public.book_appointment(uuid,date,time,text) to authenticated;
revoke all on function public.cancel_appointment(uuid) from public, anon;
grant execute on function public.cancel_appointment(uuid) to authenticated;
revoke all on function public.admin_set_appointment_status(uuid,text) from public, anon;
grant execute on function public.admin_set_appointment_status(uuid,text) to authenticated;
grant execute on function public.get_doctor_slots(uuid,date) to anon, authenticated;
grant execute on function public.get_doctor_available_dates(uuid,date,date) to anon, authenticated;
grant execute on function public.recommend_doctors(text,int) to anon, authenticated;
grant execute on function public.get_daily_stats(date,date) to authenticated;
grant execute on function public.get_admin_summary() to authenticated;
