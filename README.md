# MediBook – Smart Healthcare Appointment Booking System

A full-stack web app where patients find doctors, see live availability and book appointments online, while hospital administrators manage doctors, schedules and appointments.

**Stack:** React 18 + Vite · Tailwind CSS · Lucide React · React Router · Recharts · react-hot-toast · Supabase (PostgreSQL, Auth, Row Level Security)

---

## 1. Setup (about 10 minutes)

1. **Create a Supabase project** at <https://supabase.com> (the free tier is enough).
2. **Create the database.** Open *SQL Editor → New query*, paste **all of** `supabase/schema.sql` and click **Run**. Then do the same with `supabase/seed.sql`.
3. **(Recommended for demos)** In *Authentication → Providers → Email*, turn **off** "Confirm email" so new patients can sign in right after registering.
4. **Configure the frontend.**
   ```bash
   cp .env.example .env
   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   # (Project Settings → API → Project URL / anon public key)
   ```
5. **Run it.**
   ```bash
   npm install
   npm run dev          # http://localhost:5173
   npm run build        # production build in dist/
   ```

### Demo accounts (created by `seed.sql`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@medibook.com | Admin@123 |
| Patient | razaa@medibook.com | Patient@123 |
| Patient | sara@medibook.com | Patient@123 |
| Patient | tanvir@medibook.com | Patient@123 |

The login page has one-click buttons that fill in the demo accounts. You can re-run `seed.sql` at any time to reset the demo data. Availability is generated for the 30 days after the date you run it.

---

## 2. Where each marked feature lives

### Required features (63)

| Feature | Marks | Implementation |
|---|---|---|
| Patient registration / login | 8 | `pages/Register.jsx`, `pages/Login.jsx`, `context/AuthContext.jsx`. Supabase Auth, client-side validation (email, phone, password strength, confirmation), a `handle_new_user` trigger creates the profile, and the role is always `patient`. |
| Doctor listing with specialization | 8 | `pages/FindDoctors.jsx` and `pages/BookAppointment.jsx` show `DoctorCard` with image, name, specialization, fee, experience and rating. |
| Search doctors by specialization | 5 | Live search by name, specialty or condition, specialization filter chips and dropdown, and sorting (`hooks/useDoctors.js → filterDoctors`). |
| View doctor availability | 8 | `get_doctor_slots` and `get_doctor_available_dates` RPCs. The calendar only enables dates with free slots; booked, past and blocked slots are disabled. `pages/DoctorDetails.jsx` shows a 14-day availability strip. |
| Book an appointment | 10 | 3-column booking page (calendar + slots + concerns │ doctor list │ doctor details), saved through the `book_appointment` RPC. |
| Prevent duplicate slots | 10 | See section 3. |
| View / cancel appointments | 7 | `pages/MyAppointments.jsx` has Upcoming / Past / Cancelled tabs, search, a details modal, and cancellation through the `cancel_appointment` RPC (own, future, pending or confirmed only). |
| Admin dashboard | 7 | `pages/admin/AdminDashboard.jsx` shows doctors, patients, total, pending, confirmed and today counts, charts, and recent appointments. |

### Advanced features (20)

| Feature | Marks | Implementation |
|---|---|---|
| Appointment confirmation | 5 | `components/BookingConfirmation.jsx` shows the appointment ID (copyable), doctor, date, time, fee and status. A toast appears, and a DB trigger adds an in-app notification (bell icon) on booking and on every status change. |
| Status management | 5 | Pending / Confirmed / Cancelled / Completed. Admins use quick Confirm / Reject / Complete buttons or a status dropdown (`admin_set_appointment_status` RPC). |
| Doctor availability management | 5 | `pages/admin/ManageAvailability.jsx` lets admins generate schedules for a date range with chosen weekdays, start/end time and slot length (10–120 min). They can edit, toggle or delete windows, block whole days or time ranges, and preview a day's slots. |
| Daily appointment statistics | 5 | `get_daily_stats` RPC feeds an interactive stacked bar chart (click a bar for that day's breakdown), a status donut chart, and a table view with a range selector. |

### Bonus (5): "Recommended for You"

`recommend_doctors(specialization)` is a rule-based ranking computed in the database:

1. Doctors **with open slots** in the next 14 days come first.
2. Then the **earliest available slot** (date, then time).
3. Then **experience**.
4. The score also rewards patient rating and the number of open slots.

`components/RecommendedDoctors.jsx` shows the top matches, with their earliest slot, under a **Recommended for You** label. It appears on the Book Appointment page and on Find Doctors when a specialization is selected, and on the patient dashboard.

---

## 3. How double booking is prevented

Protection is layered, so it holds even if someone bypasses the UI:

1. **A database unique index** (`appointments_unique_active_slot`) on `(doctor_id, appointment_date, appointment_time)` covers every status except `cancelled`. Postgres itself refuses a second active booking. Cancelling an appointment frees the slot again.
2. **Atomic booking RPC.** `book_appointment()` runs in one transaction. It takes a `pg_advisory_xact_lock` keyed on doctor + date + time, so simultaneous attempts are processed one at a time. It then checks that the slot is part of the schedule, not blocked, not in the past and not booked, and inserts the row. A `unique_violation` from a race is turned into a friendly "slot already booked" message.
3. **No direct inserts.** RLS gives patients no `INSERT` policy on `appointments`, so the only way to book is through the validated RPC.
4. **UI.** Booked slots are disabled, the error is shown as a toast, the selected time is cleared, and slots and dates are refreshed after every booking attempt and whenever the window regains focus.

A second index stops a patient from holding two appointments at the same date and time.

**Tested:** three sessions booked the same slot at the same instant. Exactly one succeeded and the other two received `SLOT_TAKEN`.

**Try it yourself:** sign in as two different patients in two browsers (one normal, one private), pick the same doctor, date and time, and press **Confirm Booking** in both. The second one gets *"This slot has already been booked."*

---

## 4. Security

- **Row Level Security** is on for every table. Patients read only their own appointments, notifications and profile. Doctors, specializations, availability and reviews are public read-only. Only admins can write to them (`is_admin()`).
- **Protected routes.** `ProtectedRoute` guards the patient, shared and admin areas. Admin routes redirect non-admins, and every admin action is also re-checked in the database.
- **No privilege escalation.** The `protect_profile_fields` trigger keeps patients from changing their `role` or `email`, and signup can never create an admin.
- **Server-side validation.** All booking, cancellation and status rules are enforced in `SECURITY DEFINER` functions, not just in the UI.
- **No service-role key** appears anywhere. The browser uses only the public anon key.
- Reviews can only be written by patients who have a *completed* appointment with that doctor.

---

## 5. Database

Tables: `profiles`, `specializations`, `doctors`, `doctor_availability`, `appointments`, plus `reviews` (doctor ratings) and `notifications` (confirmations and status updates). Foreign keys, CHECK constraints (status values, slot lengths, fee ≥ 0, time windows) and indexes are all defined in `supabase/schema.sql`.

`doctor_availability` rows with `is_available = true` are working windows. Rows with `is_available = false` are blocked windows (a full day is `00:00–23:59`). Slots are generated from the working windows minus any blocked ones.

The clinic time zone used for "today" and past slots is set in `clinic_now()` (default `Asia/Dhaka`). Change it there if needed.

---

## 6. Pages

| # | Page | Route |
|---|---|---|
| 1 | Login | `/login` |
| 2 | Patient Registration | `/register` |
| 3 | Patient Dashboard | `/dashboard` |
| 4 | Book Appointment | `/book` (`?doctor=<id>` preselects a doctor) |
| 5 | Find Doctors | `/doctors` |
| 6 | Doctor Details | `/doctors/:id` |
| 7 | My Appointments | `/appointments` |
| 8 | Patient Profile | `/profile` |
| 9 | Admin Dashboard | `/admin` |
| 10 | Manage Doctors (+ specializations) | `/admin/doctors` |
| 11 | Manage Doctor Availability | `/admin/availability` |
| 12 | Manage Appointments | `/admin/appointments` |
| – | Settings (theme, notifications, logout) | `/settings` |

## 7. Project structure

```
supabase/
  schema.sql          tables, indexes, triggers, RPCs, RLS
  seed.sql            demo users, 13 doctors, 10 specializations, schedules, appointments, reviews
src/
  lib/                supabase client, data-access layer (api.js), helpers
  context/            AuthContext (session + profile + role), ThemeContext (light/dark)
  hooks/useDoctors.js
  components/         Layout (sidebar/topbar/notifications), Calendar, TimeSlots, DoctorCard,
                      DoctorDetailPanel, RecommendedDoctors, BookingConfirmation, ui primitives
  pages/              patient pages + admin/
```

Doctor photos in the demo data come from randomuser.me. If an image fails to load, an initials avatar is shown instead.
