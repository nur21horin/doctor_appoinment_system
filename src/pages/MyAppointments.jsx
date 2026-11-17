import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarX2, Clock, Eye, MessageSquarePlus, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { cn, errorMessage, formatDate, formatMoney, formatTime, isPastAppointment, shortId } from '../lib/utils'
import { refreshNotifications } from '../components/Layout'
import { Avatar, ConfirmDialog, EmptyState, ErrorState, LoadingBlock, Modal, PageHeader, Spinner, Stars, StatusBadge } from '../components/ui'

const TABS = [
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
  ['cancelled', 'Cancelled'],
  ['all', 'All'],
]

const canCancel = (a) => ['pending', 'confirmed'].includes(a.status) && !isPastAppointment(a)

export default function MyAppointments() {
  const { user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [toCancel, setToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [reviewing, setReviewing] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.myAppointments(user.id).then(setItems).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false))
  }
  useEffect(load, [user.id])

  const groups = useMemo(() => {
    const upcoming = items
      .filter((a) => ['pending', 'confirmed'].includes(a.status) && !isPastAppointment(a))
      .sort((a, b) => (a.appointment_date + a.appointment_time).localeCompare(b.appointment_date + b.appointment_time))
    const past = items.filter((a) => a.status === 'completed' || (a.status !== 'cancelled' && isPastAppointment(a)))
    const cancelled = items.filter((a) => a.status === 'cancelled')
    return { upcoming, past, cancelled, all: items }
  }, [items])

  const q = search.trim().toLowerCase()
  const visible = groups[tab].filter(
    (a) => !q || a.doctor?.full_name.toLowerCase().includes(q) || a.doctor?.specialization.toLowerCase().includes(q) || a.id.startsWith(q.replace('#', '')),
  )

  const doCancel = async () => {
    setCancelling(true)
    try {
      await api.cancelAppointment(toCancel.id)
      toast.success('Appointment cancelled. The slot is now free for others.')
      setToCancel(null)
      refreshNotifications()
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="My Appointments"
        subtitle="Track upcoming visits, review your history and cancel if plans change."
        actions={<Link to="/book" className="btn-primary"><CalendarClock className="h-4 w-4" /> New appointment</Link>}
      />

      <div className="card mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-soft p-1">
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold', tab === k ? 'bg-card shadow text-ink' : 'text-muted hover:text-ink')}>
              {label} <span className="ml-1 text-xs text-muted">{groups[k].length}</span>
            </button>
          ))}
        </div>
        <div className="relative md:ml-auto md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search doctor or appointment ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading appointments…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CalendarClock}
            title={tab === 'upcoming' ? 'No upcoming appointments' : 'Nothing here yet'}
            message={tab === 'upcoming' ? 'When you book an appointment it will appear here.' : 'Appointments matching this view will appear here.'}
            action={tab === 'upcoming' && <Link to="/book" className="btn-primary btn-sm">Book an appointment</Link>}
          />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar src={a.doctor?.profile_image} name={a.doctor?.full_name} className="h-14 w-14" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{a.doctor?.full_name}</p>
                      <p className="text-sm text-muted">{a.doctor?.specialization}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-muted" /> {formatDate(a.appointment_date)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted" /> {formatTime(a.appointment_time)}</span>
                    <span className="font-mono text-xs text-muted">{shortId(a.id)}</span>
                  </div>
                </div>
              </div>
              {a.patient_concerns && <p className="mt-3 line-clamp-2 rounded-lg bg-soft px-3 py-2 text-sm text-muted">{a.patient_concerns}</p>}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button className="btn-outline btn-sm" onClick={() => setViewing(a)}><Eye className="h-3.5 w-3.5" /> Details</button>
                {a.status === 'completed' && (
                  <button className="btn-outline btn-sm" onClick={() => setReviewing(a)}><MessageSquarePlus className="h-3.5 w-3.5" /> Rate visit</button>
                )}
                {canCancel(a) && (
                  <button className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10" onClick={() => setToCancel(a)}>
                    <CalendarX2 className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toCancel}
        title="Cancel appointment?"
        message={toCancel && `Your appointment ${shortId(toCancel.id)} with ${toCancel.doctor?.full_name} on ${formatDate(toCancel.appointment_date)} at ${formatTime(toCancel.appointment_time)} will be cancelled. This cannot be undone.`}
        confirmLabel="Yes, cancel it"
        danger
        loading={cancelling}
        onConfirm={doCancel}
        onClose={() => setToCancel(null)}
      />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing && `Appointment ${shortId(viewing.id)}`}>
        {viewing && (
          <dl className="space-y-3 text-sm">
            {[
              ['Doctor', `${viewing.doctor?.full_name} (${viewing.doctor?.specialization})`],
              ['Date', formatDate(viewing.appointment_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
              ['Time', formatTime(viewing.appointment_time)],
              ['Consultation fee', formatMoney(viewing.doctor?.consultation_fee)],
              ['Status', <StatusBadge key="s" status={viewing.status} />],
              ['Booked on', new Date(viewing.created_at).toLocaleString()],
              ['Full ID', <span key="i" className="font-mono text-xs">{viewing.id}</span>],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
            <div>
              <dt className="mb-1 text-muted">Patient concerns</dt>
              <dd className="whitespace-pre-wrap rounded-lg bg-soft p-3">{viewing.patient_concerns || '—'}</dd>
            </div>
          </dl>
        )}
      </Modal>

      {reviewing && <ReviewModal appointment={reviewing} patientName={profile.full_name} userId={user.id} onClose={() => setReviewing(null)} />}
    </div>
  )
}

function ReviewModal({ appointment, patientName, userId, onClose }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      await api.addReview({ doctor_id: appointment.doctor_id, patient_id: userId, patient_name: patientName, rating, comment: comment.trim() || null })
      toast.success('Thanks for your feedback!')
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={`Rate ${appointment.doctor?.full_name}`}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />} Submit review</button>
        </>
      }
    >
      <div className="space-y-4">
        <Stars value={rating} onChange={setRating} size="h-7 w-7" />
        <textarea className="input" rows={4} maxLength={500} placeholder="How was your visit?" value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
    </Modal>
  )
}
