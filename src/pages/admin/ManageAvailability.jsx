import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, CalendarPlus, ChevronLeft, ChevronRight, Clock, Pencil, Power, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { useDoctors } from '../../hooks/useDoctors'
import { addDays, cn, errorMessage, formatDate, formatTime, parseISODate, toISODate } from '../../lib/utils'
import { Avatar, ConfirmDialog, EmptyState, LoadingBlock, Modal, PageHeader, Spinner } from '../../components/ui'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120]
const hhmm = (t) => t?.slice(0, 5)

export default function ManageAvailability() {
  const [params, setParams] = useSearchParams()
  const { doctors, loading: docsLoading } = useDoctors({ includeInactive: true })
  const doctorId = params.get('doctor') || doctors[0]?.id || ''
  const doctor = doctors.find((d) => d.id === doctorId)

  const [month, setMonth] = useState(() => new Date())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [preview, setPreview] = useState(null)

  const monthFrom = toISODate(new Date(month.getFullYear(), month.getMonth(), 1))
  const monthTo = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 0))

  const load = useCallback(async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      setRows(await api.listAvailability(doctorId, monthFrom, monthTo))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [doctorId, monthFrom, monthTo])

  useEffect(() => { load() }, [load])

  const byDate = useMemo(() => {
    const m = new Map()
    rows.forEach((r) => m.set(r.available_date, [...(m.get(r.available_date) || []), r]))
    return [...m.entries()]
  }, [rows])

  const toggle = async (r) => {
    try {
      await api.updateAvailability(r.id, { is_available: !r.is_available })
      toast.success(r.is_available ? 'Window blocked' : 'Window re-opened')
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const doDelete = async () => {
    try {
      await api.deleteAvailability(deleting.ids)
      toast.success('Schedule removed')
      setDeleting(null)
      load()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div>
      <PageHeader title="Doctor Availability" subtitle="Create working schedules, set slot length and block unavailable dates or times." />

      <div className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        {doctor && <Avatar src={doctor.profile_image} name={doctor.full_name} className="h-12 w-12" />}
        <div className="flex-1">
          <label className="label mb-1">Doctor</label>
          <select className="input" value={doctorId} onChange={(e) => setParams({ doctor: e.target.value }, { replace: true })} disabled={docsLoading}>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}{!d.is_active ? ' (inactive)' : ''}</option>)}
          </select>
        </div>
      </div>

      {!doctorId ? (
        docsLoading ? <LoadingBlock /> : <div className="card"><EmptyState title="No doctors yet" message="Add a doctor first." /></div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-5">
            <GenerateForm doctorId={doctorId} onDone={load} />
            <BlockForm doctorId={doctorId} onDone={load} />
          </div>

          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-1.5">
                <button className="btn-outline btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
                <button className="btn-outline btn-sm" onClick={() => setMonth(new Date())}>Today</button>
                <button className="btn-outline btn-sm" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            {loading ? <LoadingBlock /> : byDate.length === 0 ? (
              <EmptyState icon={CalendarPlus} title="No schedule this month" message="Use “Generate schedule” to add working hours." />
            ) : (
              <div className="space-y-3">
                {byDate.map(([date, list]) => (
                  <div key={date} className="rounded-xl border border-line/70 p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{formatDate(date)}</p>
                      <button className="btn-ghost btn-sm ml-auto" onClick={() => setPreview(date)}><Clock className="h-3.5 w-3.5" /> Slots</button>
                      <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleting({ ids: list.map((r) => r.id), label: `all schedule entries on ${formatDate(date)}` })}><Trash2 className="h-3.5 w-3.5" /> Day</button>
                    </div>
                    <div className="space-y-2">
                      {list.map((r) => (
                        <div key={r.id} className={cn('flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm', r.is_available ? 'bg-brand-50 dark:bg-brand-500/10' : 'bg-red-50 dark:bg-red-500/10')}>
                          {r.is_available ? <Clock className="h-4 w-4 text-brand-700 dark:text-brand-300" /> : <Ban className="h-4 w-4 text-red-600" />}
                          <span className="font-medium">{formatTime(r.start_time)} – {formatTime(r.end_time)}</span>
                          <span className="text-xs text-muted">{r.is_available ? `${r.slot_duration}-min slots` : 'Blocked'}</span>
                          <div className="ml-auto flex gap-1">
                            <button className="btn-ghost btn-sm" onClick={() => toggle(r)} title={r.is_available ? 'Block this window' : 'Re-open this window'}><Power className="h-3.5 w-3.5" /></button>
                            <button className="btn-ghost btn-sm" onClick={() => setEditing(r)} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                            <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleting({ ids: [r.id], label: 'this entry' })} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {editing && <EditWindow row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {preview && <SlotPreview doctorId={doctorId} date={preview} onClose={() => setPreview(null)} />}
      <ConfirmDialog open={!!deleting} title="Delete schedule?" message={`Remove ${deleting?.label}? Existing appointments are kept, but no new bookings can be made in removed windows.`} confirmLabel="Delete" danger onConfirm={doDelete} onClose={() => setDeleting(null)} />
    </div>
  )
}

function GenerateForm({ doctorId, onDone }) {
  const today = toISODate(new Date())
  const [f, setF] = useState({ from: today, to: toISODate(addDays(new Date(), 27)), days: [0, 1, 2, 3, 4], start: '09:00', end: '13:00', duration: 30, replace: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!f.from || !f.to || f.to < f.from) return setError('End date must be on or after the start date.')
    if (f.from < today) return setError('Start date cannot be in the past.')
    if ((parseISODate(f.to) - parseISODate(f.from)) / 864e5 > 120) return setError('Please generate at most 120 days at a time.')
    if (!f.days.length) return setError('Choose at least one working day.')
    if (f.end <= f.start) return setError('End time must be after start time.')
    const minutes = (Number(f.end.slice(0, 2)) * 60 + Number(f.end.slice(3))) - (Number(f.start.slice(0, 2)) * 60 + Number(f.start.slice(3)))
    if (minutes < f.duration) return setError('The window is shorter than one appointment.')

    setSaving(true)
    try {
      const existing = await api.listAvailability(doctorId, f.from, f.to)
      const working = existing.filter((r) => r.is_available)
      if (f.replace && working.length) await api.deleteAvailability(working.map((r) => r.id))
      const keep = f.replace ? [] : working

      const rows = []
      let skipped = 0
      for (let d = parseISODate(f.from); toISODate(d) <= f.to; d = addDays(d, 1)) {
        if (!f.days.includes(d.getDay())) continue
        const iso = toISODate(d)
        const overlaps = keep.some((r) => r.available_date === iso && hhmm(r.start_time) < f.end && hhmm(r.end_time) > f.start)
        if (overlaps) { skipped++; continue }
        rows.push({ doctor_id: doctorId, available_date: iso, start_time: f.start, end_time: f.end, slot_duration: Number(f.duration), is_available: true })
      }
      if (rows.length) await api.insertAvailability(rows)
      toast.success(`${rows.length} day${rows.length !== 1 ? 's' : ''} scheduled${skipped ? ` · ${skipped} skipped (overlap)` : ''}`)
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" noValidate>
      <h2 className="flex items-center gap-2 font-bold"><CalendarPlus className="h-5 w-5" /> Generate schedule</h2>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">From</label><input type="date" className="input" min={today} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></div>
        <div><label className="label">To</label><input type="date" className="input" min={f.from} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></div>
      </div>
      <div>
        <label className="label">Available days</label>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w}
              type="button"
              onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i] })}
              className={cn('rounded-lg border py-2 text-xs font-semibold', f.days.includes(i) ? 'border-brand-700 bg-brand-700 text-white' : 'border-line hover:bg-soft')}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Start</label><input type="time" className="input px-2" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
        <div><label className="label">End</label><input type="time" className="input px-2" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
        <div>
          <label className="label">Slot</label>
          <select className="input px-2" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={f.replace} onChange={(e) => setF({ ...f, replace: e.target.checked })} />
        Replace existing working hours in this range
      </label>
      {error && <p className="field-error">{error}</p>}
      <button className="btn-primary w-full" disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />} Generate</button>
    </form>
  )
}

function BlockForm({ doctorId, onDone }) {
  const today = toISODate(new Date())
  const [f, setF] = useState({ date: today, allDay: true, start: '12:00', end: '13:00' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!f.date || f.date < today) return setError('Choose today or a future date.')
    if (!f.allDay && f.end <= f.start) return setError('End time must be after start time.')
    setSaving(true)
    try {
      await api.insertAvailability([{
        doctor_id: doctorId,
        available_date: f.date,
        start_time: f.allDay ? '00:00' : f.start,
        end_time: f.allDay ? '23:59' : f.end,
        slot_duration: 30,
        is_available: false,
      }])
      toast.success(f.allDay ? `${formatDate(f.date)} blocked` : `Blocked ${formatTime(f.start)}–${formatTime(f.end)} on ${formatDate(f.date)}`)
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5" noValidate>
      <h2 className="flex items-center gap-2 font-bold"><Ban className="h-5 w-5" /> Block date or time</h2>
      <div><label className="label">Date</label><input type="date" min={today} className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={f.allDay} onChange={(e) => setF({ ...f, allDay: e.target.checked })} /> Block the whole day (leave, holiday)
      </label>
      {!f.allDay && (
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">From</label><input type="time" className="input" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
          <div><label className="label">To</label><input type="time" className="input" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
      <button className="btn-danger w-full" disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />} Block</button>
    </form>
  )
}

function EditWindow({ row, onClose, onSaved }) {
  const [f, setF] = useState({ start: hhmm(row.start_time), end: hhmm(row.end_time), duration: row.slot_duration, is_available: row.is_available })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (f.end <= f.start) return toast.error('End time must be after start time.')
    setSaving(true)
    try {
      await api.updateAvailability(row.id, { start_time: f.start, end_time: f.end, slot_duration: Number(f.duration), is_available: f.is_available })
      toast.success('Schedule updated')
      onSaved()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={`Edit ${formatDate(row.available_date)}`} footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />} Save</button></>}>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="label">Start</label><input type="time" className="input px-2" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></div>
        <div><label className="label">End</label><input type="time" className="input px-2" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div>
        <div>
          <label className="label">Slot</label>
          <select className="input px-2" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} min</option>)}
          </select>
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={f.is_available} onChange={(e) => setF({ ...f, is_available: e.target.checked })} />
        Available for booking (uncheck to block this window)
      </label>
    </Modal>
  )
}

function SlotPreview({ doctorId, date, onClose }) {
  const [slots, setSlots] = useState(null)
  useEffect(() => {
    api.getSlots(doctorId, date).then(setSlots).catch((e) => { toast.error(errorMessage(e)); setSlots([]) })
  }, [doctorId, date])
  return (
    <Modal open onClose={onClose} title={`Slots on ${formatDate(date)}`}>
      {!slots ? <LoadingBlock /> : slots.length === 0 ? <p className="text-sm text-muted">No slots generated for this date.</p> : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((s) => {
            const state = !s.is_available ? 'Blocked' : s.is_booked ? 'Booked' : s.is_past ? 'Past' : 'Free'
            return (
              <div key={s.slot_time} className={cn('rounded-lg border px-2 py-2 text-center text-xs', state === 'Free' ? 'border-brand-300 bg-brand-50 dark:bg-brand-500/10' : state === 'Booked' ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/10' : 'border-line bg-soft text-muted')}>
                <p className="font-semibold">{formatTime(s.slot_time)}</p>
                <p>{state}</p>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
