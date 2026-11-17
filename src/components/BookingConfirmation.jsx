import { CheckCircle2, Copy } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatDate, formatMoney, formatTime, shortId } from '../lib/utils'
import { Avatar, Modal, StatusBadge } from './ui'

export default function BookingConfirmation({ appointment, doctor, onClose }) {
  if (!appointment) return null
  const copy = () => {
    navigator.clipboard?.writeText(appointment.id)
    toast.success('Appointment ID copied')
  }
  return (
    <Modal open onClose={onClose} size="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h2 className="text-xl font-bold">Appointment booked!</h2>
        <p className="mt-1 text-sm text-muted">Your request was received. You'll be notified once the clinic confirms it.</p>
      </div>
      <div className="mt-5 space-y-3 rounded-2xl bg-soft p-4 text-sm">
        <div className="flex items-center gap-3">
          <Avatar src={doctor?.profile_image} name={doctor?.full_name} className="h-12 w-12" />
          <div>
            <p className="font-semibold">{doctor?.full_name}</p>
            <p className="text-muted">{doctor?.specialization}</p>
          </div>
        </div>
        <Row label="Appointment ID">
          <button onClick={copy} className="flex items-center gap-1 font-mono font-semibold text-brand-700 dark:text-brand-300">
            {shortId(appointment.id)} <Copy className="h-3.5 w-3.5" />
          </button>
        </Row>
        <Row label="Date">{formatDate(appointment.appointment_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Row>
        <Row label="Time">{formatTime(appointment.appointment_time)}</Row>
        <Row label="Fee">{formatMoney(doctor?.consultation_fee)}</Row>
        <Row label="Status"><StatusBadge status={appointment.status} /></Row>
      </div>
      <div className="mt-5 flex gap-2">
        <button className="btn-outline flex-1" onClick={onClose}>Book another</button>
        <Link to="/appointments" className="btn-primary flex-1">My Appointments</Link>
      </div>
    </Modal>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-3">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}
