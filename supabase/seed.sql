-- =====================================================================
-- MediBook demo data. Run AFTER schema.sql in the Supabase SQL Editor.
-- Demo logins (all passwords are shown below):
--   Admin    admin@medibook.com     Admin@123
--   Patient  razaa@medibook.com     Patient@123
--   Patient  sara@medibook.com      Patient@123
--   Patient  tanvir@medibook.com    Patient@123
-- Safe to re-run: it clears the demo tables first.
-- =====================================================================

-- ---------- demo auth users ----------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('11111111-1111-1111-1111-111111111111'::uuid, 'admin@medibook.com',  'Admin@123',   'Hospital Admin', '+8801700000000'),
      ('22222222-2222-2222-2222-222222222222'::uuid, 'razaa@medibook.com',  'Patient@123', 'Razaa Ahmed',    '+8801711111111'),
      ('33333333-3333-3333-3333-333333333333'::uuid, 'sara@medibook.com',   'Patient@123', 'Sara Karim',     '+8801722222222'),
      ('44444444-4444-4444-4444-444444444444'::uuid, 'tanvir@medibook.com', 'Patient@123', 'Tanvir Hasan',   '+8801733333333')
    ) as t(id, email, pw, name, phone)
  loop
    if not exists (select 1 from auth.users where email = u.email) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
        crypt(u.pw, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('full_name', u.name, 'phone', u.phone)::jsonb,
        now(), now(), '', '', '', ''
      );
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), u.id, u.id::text,
        json_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true)::jsonb,
        'email', now(), now(), now());
    end if;
  end loop;
end $$;

-- make sure profiles exist (trigger normally does this) and promote the admin
insert into public.profiles (id, full_name, email, phone, role)
select id, raw_user_meta_data->>'full_name', email, raw_user_meta_data->>'phone', 'patient'
from auth.users where email like '%@medibook.com'
on conflict (id) do nothing;
update public.profiles set role = 'admin' where email = 'admin@medibook.com';

-- ---------- reset demo tables ----------
delete from public.notifications;
delete from public.appointments;
delete from public.reviews;
delete from public.doctor_availability;
delete from public.doctors;
delete from public.specializations;

-- ---------- specializations ----------
insert into public.specializations (name, description) values
  ('Dermatologist',        'Skin, hair and nail conditions'),
  ('Neurologist',          'Brain, spinal cord and nervous system disorders'),
  ('Dentist',              'Oral health, teeth and gums'),
  ('Psychiatrist',         'Mental health, mood and behavioural disorders'),
  ('General Practitioner', 'Primary care and everyday health concerns'),
  ('Cardiologist',         'Heart and blood vessel conditions'),
  ('Pediatrician',         'Health care for infants, children and teens'),
  ('Orthopedic Surgeon',   'Bones, joints, ligaments and muscles'),
  ('Gynecologist',         'Women''s reproductive health'),
  ('ENT Specialist',       'Ear, nose and throat conditions');

-- ---------- doctors ----------
insert into public.doctors (id, full_name, specialization, profile_image, experience, consultation_fee, biography, specialties) values
('d0000000-0000-0000-0000-000000000001','Dr. Farhana Rahman','Dermatologist','https://randomuser.me/api/portraits/women/32.jpg',10,20,
 'Over 10 years in clinical dermatology, treating a wide range of conditions from acne to autoimmune skin diseases. Known for clear explanations and practical treatment plans.',
 array['General Dermatology','Skin Allergy Treatment','Acne & Scarring Care']),
('d0000000-0000-0000-0000-000000000002','Dr. Tanvir Ahmed','Neurologist','https://randomuser.me/api/portraits/men/45.jpg',14,20,
 'Consultant neurologist focused on headache disorders, epilepsy and stroke prevention, with 14 years of hospital experience.',
 array['Migraine & Headache','Epilepsy Care','Stroke Prevention']),
('d0000000-0000-0000-0000-000000000003','Dr. Saifur Rahman','Dentist','https://randomuser.me/api/portraits/men/22.jpg',7,20,
 'Friendly family dentist offering preventive, restorative and cosmetic dental care for all ages.',
 array['Root Canal Treatment','Teeth Whitening','Pediatric Dentistry']),
('d0000000-0000-0000-0000-000000000004','Dr. Mahmudul Hasan','Neurologist','https://randomuser.me/api/portraits/men/52.jpg',8,20,
 'Neurologist with a special interest in sleep disorders and peripheral neuropathy.',
 array['Sleep Disorders','Neuropathy','Movement Disorders']),
('d0000000-0000-0000-0000-000000000005','Dr. Nusrat Jahan','Psychiatrist','https://randomuser.me/api/portraits/women/44.jpg',9,20,
 'Compassionate psychiatrist helping adults manage anxiety, depression and stress through evidence-based care.',
 array['Anxiety Disorders','Depression','Stress Management']),
('d0000000-0000-0000-0000-000000000006','Prof. Ahsan Habib','General Practitioner','https://randomuser.me/api/portraits/men/65.jpg',22,30,
 'Senior general practitioner and professor of family medicine with over two decades of primary-care experience.',
 array['Preventive Health','Chronic Disease Management','Health Check-ups']),
('d0000000-0000-0000-0000-000000000007','Dr. Arif Hossain','Cardiologist','https://randomuser.me/api/portraits/men/75.jpg',12,20,
 'Interventional cardiologist experienced in hypertension, heart failure and cardiac risk assessment.',
 array['Hypertension','Heart Failure','ECG & Echo Review']),
('d0000000-0000-0000-0000-000000000008','Prof. Sharmeen Akter','Psychiatrist','https://randomuser.me/api/portraits/women/68.jpg',25,32,
 'Professor of psychiatry with 25 years of experience in mood disorders and adolescent mental health.',
 array['Mood Disorders','Adolescent Psychiatry','Psychotherapy']),
('d0000000-0000-0000-0000-000000000009','Dr. Sadia Islam','Pediatrician','https://randomuser.me/api/portraits/women/26.jpg',11,25,
 'Pediatrician dedicated to child development, vaccinations and common childhood illnesses.',
 array['Child Development','Vaccinations','Newborn Care']),
('d0000000-0000-0000-0000-000000000010','Dr. Marium Sultana','Gynecologist','https://randomuser.me/api/portraits/women/33.jpg',15,28,
 'Gynecologist providing compassionate care in reproductive health, pregnancy and menopause.',
 array['Prenatal Care','PCOS Management','Menopause Care']),
('d0000000-0000-0000-0000-000000000011','Dr. Rezaul Karim','Orthopedic Surgeon','https://randomuser.me/api/portraits/men/86.jpg',18,35,
 'Orthopedic surgeon specialising in sports injuries, joint pain and minimally invasive procedures.',
 array['Sports Injuries','Knee & Shoulder','Arthritis Care']),
('d0000000-0000-0000-0000-000000000012','Dr. Rukaiya Chowdhury','ENT Specialist','https://randomuser.me/api/portraits/women/12.jpg',6,22,
 'ENT specialist treating sinus problems, hearing loss and throat infections in adults and children.',
 array['Sinusitis','Hearing Loss','Tonsil & Throat Care']),
('d0000000-0000-0000-0000-000000000013','Dr. Mehnaz Karim','Dermatologist','https://randomuser.me/api/portraits/women/50.jpg',4,18,
 'Dermatologist focused on cosmetic dermatology, pigmentation and hair-loss treatment.',
 array['Pigmentation','Hair Loss','Cosmetic Dermatology']);

-- ---------- availability: next 30 days, weekday patterns per doctor ----------
-- pattern: (doctor, weekdays [0=Sun..6=Sat], start, end, slot minutes)
insert into public.doctor_availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available)
select p.doctor_id, d::date, p.start_t, p.end_t, p.dur, true
from (values
  ('d0000000-0000-0000-0000-000000000001'::uuid, array[0,1,2,3,4], '08:00'::time, '12:00'::time, 60),
  ('d0000000-0000-0000-0000-000000000001'::uuid, array[1,3],       '14:30'::time, '18:30'::time, 60),
  ('d0000000-0000-0000-0000-000000000002'::uuid, array[0,2,4],     '09:00'::time, '13:00'::time, 30),
  ('d0000000-0000-0000-0000-000000000003'::uuid, array[0,1,2,3,4,6], '10:00'::time, '16:00'::time, 30),
  ('d0000000-0000-0000-0000-000000000004'::uuid, array[1,3,6],     '15:00'::time, '19:00'::time, 30),
  ('d0000000-0000-0000-0000-000000000005'::uuid, array[0,1,2,3],   '09:00'::time, '15:00'::time, 60),
  ('d0000000-0000-0000-0000-000000000006'::uuid, array[0,1,2,3,4,6], '08:00'::time, '14:00'::time, 20),
  ('d0000000-0000-0000-0000-000000000007'::uuid, array[0,2,4],     '10:00'::time, '14:00'::time, 30),
  ('d0000000-0000-0000-0000-000000000008'::uuid, array[1,3],       '16:00'::time, '20:00'::time, 60),
  ('d0000000-0000-0000-0000-000000000009'::uuid, array[0,1,2,3,4], '09:00'::time, '13:00'::time, 20),
  ('d0000000-0000-0000-0000-000000000010'::uuid, array[0,2,3,6],   '11:00'::time, '17:00'::time, 30),
  ('d0000000-0000-0000-0000-000000000011'::uuid, array[1,4],       '09:00'::time, '13:00'::time, 45),
  ('d0000000-0000-0000-0000-000000000012'::uuid, array[0,1,3,4],   '14:00'::time, '18:00'::time, 30),
  ('d0000000-0000-0000-0000-000000000013'::uuid, array[2,6],       '10:00'::time, '14:00'::time, 30)
) as p(doctor_id, days, start_t, end_t, dur)
cross join generate_series(public.clinic_now()::date, public.clinic_now()::date + 30, interval '1 day') d
where extract(dow from d)::int = any(p.days);

-- a blocked lunch hour and a blocked full day (shows the "block" feature)
insert into public.doctor_availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available)
select 'd0000000-0000-0000-0000-000000000003', d, '13:00', '14:00', 30, false
from (select min(available_date) d from public.doctor_availability
      where doctor_id = 'd0000000-0000-0000-0000-000000000003' and available_date > public.clinic_now()::date) x;

insert into public.doctor_availability (doctor_id, available_date, start_time, end_time, slot_duration, is_available)
select 'd0000000-0000-0000-0000-000000000006', d, '00:00', '23:59', 30, false
from (select max(available_date) d from public.doctor_availability
      where doctor_id = 'd0000000-0000-0000-0000-000000000006') x;

-- ---------- appointments with every status ----------
-- future appointments use the first scheduled dates of each doctor so they fall on real slots
insert into public.appointments (patient_id, doctor_id, appointment_date, appointment_time, patient_concerns, status, created_at)
select '22222222-2222-2222-2222-222222222222'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, d, '09:00'::time,
  E'Red, itchy skin for a week. Worse after sun.\nSymptoms: flaky patches, mild burning, skin sensitivity', 'confirmed'::text, now() - interval '2 days'
from (select min(available_date) d from public.doctor_availability where doctor_id='d0000000-0000-0000-0000-000000000001' and available_date > public.clinic_now()::date) x
union all
select '33333333-3333-3333-3333-333333333333'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, d, '10:00'::time,
  'Persistent acne on cheeks and forehead.'::text, 'pending'::text, now() - interval '1 day'
from (select min(available_date) d from public.doctor_availability where doctor_id='d0000000-0000-0000-0000-000000000001' and available_date > public.clinic_now()::date) x
union all
select '44444444-4444-4444-4444-444444444444'::uuid, 'd0000000-0000-0000-0000-000000000002'::uuid, d, '09:30'::time,
  'Frequent migraines, 3-4 times per week.'::text, 'pending'::text, now()
from (select min(available_date) d from public.doctor_availability where doctor_id='d0000000-0000-0000-0000-000000000002' and available_date > public.clinic_now()::date) x
union all
select '22222222-2222-2222-2222-222222222222'::uuid, 'd0000000-0000-0000-0000-000000000007'::uuid, d, '11:00'::time,
  'Occasional chest tightness when climbing stairs.'::text, 'pending'::text, now()
from (select min(available_date) d from public.doctor_availability where doctor_id='d0000000-0000-0000-0000-000000000007' and available_date > public.clinic_now()::date) x
union all
select '33333333-3333-3333-3333-333333333333'::uuid, 'd0000000-0000-0000-0000-000000000006'::uuid, d, '08:20'::time,
  'Annual health check-up.'::text, 'confirmed'::text, now()
from (select min(available_date) d from public.doctor_availability where doctor_id='d0000000-0000-0000-0000-000000000006' and available_date > public.clinic_now()::date) x
union all
select '44444444-4444-4444-4444-444444444444'::uuid, 'd0000000-0000-0000-0000-000000000003'::uuid, d, '10:30'::time,
  'Tooth sensitivity to cold drinks.'::text, 'cancelled'::text, now() - interval '3 days'
from (select min(available_date) d from public.doctor_availability where doctor_id='d0000000-0000-0000-0000-000000000003' and available_date > public.clinic_now()::date) x;

-- past appointments (history + statistics over the last two weeks)
insert into public.appointments (patient_id, doctor_id, appointment_date, appointment_time, patient_concerns, status, created_at)
select p.pid, p.did, public.clinic_now()::date - p.days_ago, p.t, p.c, p.s, now() - make_interval(days => p.days_ago + 2)
from (values
  ('22222222-2222-2222-2222-222222222222'::uuid,'d0000000-0000-0000-0000-000000000006'::uuid, 12,'09:00'::time,'Fever and sore throat.','completed'),
  ('22222222-2222-2222-2222-222222222222'::uuid,'d0000000-0000-0000-0000-000000000001'::uuid,  9,'10:00'::time,'Skin rash on arms.','completed'),
  ('33333333-3333-3333-3333-333333333333'::uuid,'d0000000-0000-0000-0000-000000000005'::uuid,  9,'11:00'::time,'Trouble sleeping, feeling anxious.','completed'),
  ('44444444-4444-4444-4444-444444444444'::uuid,'d0000000-0000-0000-0000-000000000003'::uuid,  7,'10:00'::time,'Routine dental cleaning.','completed'),
  ('33333333-3333-3333-3333-333333333333'::uuid,'d0000000-0000-0000-0000-000000000009'::uuid,  6,'09:20'::time,'Child vaccination.','completed'),
  ('44444444-4444-4444-4444-444444444444'::uuid,'d0000000-0000-0000-0000-000000000007'::uuid,  5,'10:30'::time,'High blood pressure follow-up.','cancelled'),
  ('22222222-2222-2222-2222-222222222222'::uuid,'d0000000-0000-0000-0000-000000000002'::uuid,  4,'09:00'::time,'Dizziness.','completed'),
  ('33333333-3333-3333-3333-333333333333'::uuid,'d0000000-0000-0000-0000-000000000010'::uuid,  3,'11:30'::time,'Routine check-up.','completed'),
  ('44444444-4444-4444-4444-444444444444'::uuid,'d0000000-0000-0000-0000-000000000012'::uuid,  2,'14:00'::time,'Blocked nose for weeks.','cancelled'),
  ('22222222-2222-2222-2222-222222222222'::uuid,'d0000000-0000-0000-0000-000000000011'::uuid,  1,'09:45'::time,'Knee pain after running.','completed')
) as p(pid, did, days_ago, t, c, s);

-- ---------- reviews ----------
insert into public.reviews (doctor_id, patient_id, patient_name, rating, comment) values
('d0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','Razaa Ahmed',5,'Dr. Edwards was clear, caring and professional. My skin improved thanks to his treatment plan. Recommended!'),
('d0000000-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','Sara Karim',4,'Very knowledgeable and patient with my questions.'),
('d0000000-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','Razaa Ahmed',5,'Finally found the cause of my dizziness. Thorough examination.'),
('d0000000-0000-0000-0000-000000000003','44444444-4444-4444-4444-444444444444','Tanvir Hasan',4,'Painless cleaning, very gentle.'),
('d0000000-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333','Sara Karim',5,'Made me feel heard. Great listener.'),
('d0000000-0000-0000-0000-000000000006','22222222-2222-2222-2222-222222222222','Razaa Ahmed',5,'Experienced and efficient. Explained everything well.'),
('d0000000-0000-0000-0000-000000000007','44444444-4444-4444-4444-444444444444','Tanvir Hasan',4,'Good advice on managing my blood pressure.'),
('d0000000-0000-0000-0000-000000000008','33333333-3333-3333-3333-333333333333','Sara Karim',5,'Exceptional expertise and very kind.'),
('d0000000-0000-0000-0000-000000000009','33333333-3333-3333-3333-333333333333','Sara Karim',5,'My kids love her!'),
('d0000000-0000-0000-0000-000000000010','33333333-3333-3333-3333-333333333333','Sara Karim',4,'Professional and reassuring.'),
('d0000000-0000-0000-0000-000000000011','22222222-2222-2222-2222-222222222222','Razaa Ahmed',5,'Knee is much better after his advice.'),
('d0000000-0000-0000-0000-000000000012','44444444-4444-4444-4444-444444444444','Tanvir Hasan',3,'Good doctor, but the wait was long.');

-- seed creates notifications via trigger; mark the historical ones read
update public.notifications n set is_read = true
from public.appointments a
where n.message like '%' || upper(left(a.id::text, 8)) || '%' and a.appointment_date < public.clinic_now()::date;
