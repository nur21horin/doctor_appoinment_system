import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarCheck2, CalendarClock, CalendarPlus, CheckCircle2, Clock3, Stethoscope } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useDoctors } from '../hooks/useDoctors'
import { errorMessage, formatDate, formatTime, isPastAppointment, shortId } from '../lib/utils'
import RecommendedDoctors from '../components/RecommendedDoctors'
import { Avatar, EmptyState, ErrorState, LoadingBlock, StatCard, StatusBadge } from '../components/ui'

export default function PatientDashboard() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const { doctors, specializations } = useDoctors()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [spec, setSpec] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    api.myAppointments(user.id).then(setAppointments).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false))
  }
  useEffect(load, [user.id])

  const byId = useMemo(() => Object.fromEntries(doctors.map((d) => [d.id, d])), [doctors])
  const upcoming = appointments
    .filter((a) => ['pending', 'confirmed'].includes(a.status) && !isPastAppointment(a))
    .sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time))
  const count = (s) => appointments.filter((a) => a.status === s).length
  const next = upcoming[0]

  return (
    <div className="space-y-6">
      <div className="card flex flex-col gap-4 overflow-hidden bg-gradient-to-r from-brand-800 to-brand-600 p-6 text-white sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="text-sm text-white/70">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h2 className="mt-1 text-2xl font-bold">Hello, {profile?.full_name?.split(' ')[0]} 👋</h2>
          <p className="mt-1 text-sm text-white/80">
            {next ? <>Your next visit is with <b>{next.doctor?.full_name}</b> on {formatDate(next.appointment_date)} at {formatTime(next.appointment_time)}.</> : 'You have no upcoming appointments. Book one in a few clicks.'}
          </p>
        </div>
        <Link to="/book" className="btn bg-white text-brand-800 hover:bg-brand-50"><CalendarPlus className="h-4 w-4" /> Book Appointment</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CalendarClock} label="Upcoming" value={loading ? '…' : upcoming.length} />
        <StatCard icon={Clock3} label="Pending" value={loading ? '…' : count('pending')} tone="amber" />
        <StatCard icon={CalendarCheck2} label="Confirmed" value={loading ? '…' : count('confirmed')} tone="violet" />
        <StatCard icon={CheckCircle2} label="Completed visits" value={loading ? '…' : count('completed')} tone="sky" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">Upcoming appointments</h2>
            <Link to="/appointments" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">View all</Link>
          </div>
          {loading ? <LoadingBlock /> : error ? <ErrorState message={error} onRetry={load} /> : upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing scheduled" message="Booked appointments will show up here." action={<Link to="/book" className="btn-primary btn-sm">Book now</Link>} />
          ) : (
            <ul className="space-y-3">
              {upcoming.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line/70 p-3">
                  <Avatar src={a.doctor?.profile_image} name={a.doctor?.full_name} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.doctor?.full_name}</p>
                    <p className="text-xs text-muted">{formatDate(a.appointment_date)} · {formatTime(a.appointment_time)} · {shortId(a.id)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Stethoscope className="h-5 w-5" /> Need a specialist?</h2>
            <select className="input w-full sm:w-56" value={spec} onChange={(e) => setSpec(e.target.value)}>
              <option value="">Any specialization</option>
              {specializations.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <RecommendedDoctors
            specialization={spec}
            doctorsById={byId}
            onBook={(d) => navigate(`/book?doctor=${d.id}`)}
            onDetail={(d) => navigate(`/doctors/${d.id}`)}
          />
        </section>
      </div>
    </div>
  )
}
