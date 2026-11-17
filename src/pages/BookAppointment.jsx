import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarCheck2, Filter, Search, Stethoscope, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { filterDoctors, useDoctors } from '../hooks/useDoctors'
import { cn, errorMessage, formatDate, formatTime, isSlotTakenError } from '../lib/utils'
import Calendar from '../components/Calendar'
import TimeSlots from '../components/TimeSlots'
import DoctorCard from '../components/DoctorCard'
import DoctorDetailPanel from '../components/DoctorDetailPanel'
import RecommendedDoctors from '../components/RecommendedDoctors'
import BookingConfirmation from '../components/BookingConfirmation'
import { refreshNotifications } from '../components/Layout'
import { Avatar, EmptyState, ErrorState, LoadingBlock, Modal, Spinner } from '../components/ui'

export default function BookAppointment() {
  const { profile } = useAuth()
  const [params, setParams] = useSearchParams()
  const { doctors, specializations, loading, error, reload } = useDoctors()

  const [search, setSearch] = useState('')
  const [specialization, setSpecialization] = useState(params.get('specialization') || '')
  const [selectedId, setSelectedId] = useState(params.get('doctor') || null)
  const [detailId, setDetailId] = useState(null)
  const [detailModal, setDetailModal] = useState(false)

  const [month, setMonth] = useState(() => new Date())
  const [availableDates, setAvailableDates] = useState(new Map())
  const [datesLoading, setDatesLoading] = useState(false)
  const [date, setDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [time, setTime] = useState(null)
  const [concerns, setConcerns] = useState('')
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const byId = useMemo(() => Object.fromEntries(doctors.map((d) => [d.id, d])), [doctors])
  const selected = selectedId ? byId[selectedId] : null
  const detailDoctor = byId[detailId] || selected || doctors[0] || null
  const filtered = useMemo(() => filterDoctors(doctors, { search, specialization }), [doctors, search, specialization])

  // ---- load available dates for the visible month ----
  const loadDates = useCallback(async () => {
    if (!selectedId) return setAvailableDates(new Map())
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    const today = new Date()
    const from = start < today ? today : start
    if (from > end) return setAvailableDates(new Map())
    setDatesLoading(true)
    try {
      const rows = await api.getAvailableDates(selectedId, from, end)
      const map = new Map(rows.map((r) => [r.available_date, r.free_slots]))
      setAvailableDates(map)
      return map
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDatesLoading(false)
    }
  }, [selectedId, month])

  useEffect(() => {
    loadDates().then((map) => {
      // auto-pick the first available date in view if nothing valid is selected
      if (map && map.size && (!date || !map.has(date))) setDate([...map.keys()].sort()[0])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadDates])

  // ---- load slots for the selected date ----
  const loadSlots = useCallback(async () => {
    if (!selectedId || !date) return setSlots([])
    setSlotsLoading(true)
    try {
      setSlots(await api.getSlots(selectedId, date))
    } catch (e) {
      toast.error(errorMessage(e))
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }, [selectedId, date])

  useEffect(() => {
    setTime(null)
    loadSlots()
  }, [loadSlots])

  // keep slots fresh while the patient is deciding
  useEffect(() => {
    const onFocus = () => loadSlots()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadSlots])

  const chooseDoctor = (doc) => {
    setSelectedId(doc.id)
    setDetailId(doc.id)
    setDate(null)
    setTime(null)
    setErrors({})
    setMonth(new Date())
    setParams((p) => {
      p.set('doctor', doc.id)
      return p
    }, { replace: true })
    if (window.innerWidth < 1280) document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth' })
  }

  const showDetail = (doc) => {
    setDetailId(doc.id)
    if (window.innerWidth < 1280) setDetailModal(true)
  }

  const validate = () => {
    const e = {}
    if (!selectedId) e.doctor = 'Please choose a doctor from the list.'
    if (!date) e.date = 'Please select an appointment date.'
    if (!time) e.time = 'Please select an available time slot.'
    if (concerns.trim().length < 5) e.concerns = 'Please describe your concerns (at least 5 characters).'
    if (concerns.length > 1000) e.concerns = 'Please keep it under 1000 characters.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return toast.error('Please complete the highlighted fields.')
    setSubmitting(true)
    try {
      const appt = await api.bookAppointment({ doctorId: selectedId, date, time, concerns: concerns.trim() })
      setConfirmation({ appointment: appt, doctor: selected })
      toast.success('Appointment booked successfully!')
      setConcerns('')
      setTime(null)
      refreshNotifications()
    } catch (e) {
      toast.error(errorMessage(e))
      if (isSlotTakenError(e)) setTime(null)
    } finally {
      setSubmitting(false)
      loadSlots()
      loadDates()
      setRefreshKey((k) => k + 1)
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)_300px]">
      {/* LEFT – booking */}
      <section id="booking-panel" className="card h-fit space-y-5 p-5 xl:sticky xl:top-20">
        <h2 className="text-lg font-bold">Booking Appointment</h2>

        {selected ? (
          <div className="flex items-center gap-3 rounded-xl bg-soft p-2.5">
            <Avatar src={selected.profile_image} name={selected.full_name} className="h-11 w-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{selected.full_name}</p>
              <p className="truncate text-xs text-muted">{selected.specialization}</p>
            </div>
            <button
              className="btn-ghost btn-sm"
              onClick={() => {
                setSelectedId(null)
                setDate(null)
                setParams({}, { replace: true })
              }}
              aria-label="Clear doctor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className={cn('rounded-xl border border-dashed p-4 text-center text-sm text-muted', errors.doctor ? 'border-red-400' : 'border-line')}>
            <Stethoscope className="mx-auto mb-1 h-5 w-5" />
            Select a doctor with <b>Book Now</b> to see their availability.
          </div>
        )}
        {errors.doctor && <p className="field-error -mt-3">{errors.doctor}</p>}

        <Calendar
          month={month}
          onMonthChange={setMonth}
          value={date}
          onChange={(d) => {
            setDate(d)
            setErrors((e) => ({ ...e, date: undefined }))
          }}
          availableDates={selectedId ? availableDates : new Map()}
          loading={datesLoading}
        />
        {errors.date && <p className="field-error -mt-3">{errors.date}</p>}

        <div>
          <p className="mb-2.5 font-semibold">{date ? formatDate(date) : 'Choose a date'}</p>
          {selectedId && date ? (
            <TimeSlots
              slots={slots}
              loading={slotsLoading}
              value={time}
              onChange={(t) => {
                setTime(t)
                setErrors((e) => ({ ...e, time: undefined }))
              }}
            />
          ) : (
            <p className="rounded-xl bg-soft px-4 py-5 text-center text-sm text-muted">
              {selectedId ? (datesLoading ? 'Loading dates…' : availableDates.size ? 'Pick a highlighted date.' : 'No availability this month — try the next month.') : 'Time slots appear here.'}
            </p>
          )}
          {errors.time && <p className="field-error">{errors.time}</p>}
        </div>

        <div>
          <label className="label" htmlFor="concerns">Patient Concerns</label>
          <textarea
            id="concerns"
            rows={4}
            maxLength={1000}
            className={cn('input resize-none', errors.concerns && 'input-error')}
            placeholder={'e.g. Red, itchy skin for a week. Worse after sun.\nSymptoms: flaky patches, mild burning'}
            value={concerns}
            onChange={(e) => {
              setConcerns(e.target.value)
              if (errors.concerns) setErrors((x) => ({ ...x, concerns: undefined }))
            }}
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-red-600">{errors.concerns}</span>
            <span className="text-muted">{concerns.length}/1000</span>
          </div>
        </div>

        {selected && date && time && (
          <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900 dark:bg-brand-500/10 dark:text-brand-100">
            <b>{selected.full_name}</b> · {formatDate(date)} · {formatTime(time)}
          </div>
        )}

        <button className="btn-primary w-full py-3" onClick={submit} disabled={submitting}>
          {submitting ? <Spinner className="h-4 w-4 text-white" /> : <CalendarCheck2 className="h-4 w-4" />}
          {submitting ? 'Booking…' : 'Confirm Booking'}
        </button>
        <p className="text-center text-xs text-muted">Booking as {profile?.full_name}</p>
      </section>

      {/* MIDDLE – doctor list */}
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-lg font-bold">Doctor List</h2>
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Search Doctor" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="relative w-full sm:w-52">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <select className="input appearance-none pl-9" value={specialization} onChange={(e) => setSpecialization(e.target.value)}>
              <option value="">All specializations</option>
              {specializations.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {specialization && (
          <RecommendedDoctors specialization={specialization} onBook={chooseDoctor} onDetail={showDetail} doctorsById={byId} refreshKey={refreshKey} />
        )}

        {loading ? (
          <LoadingBlock label="Loading doctors…" />
        ) : filtered.length === 0 ? (
          <div className="card">
            <EmptyState title="No doctors found" message="Try a different name or clear the specialization filter." action={
              <button className="btn-outline btn-sm" onClick={() => { setSearch(''); setSpecialization('') }}>Clear filters</button>
            } />
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">{filtered.length} doctor{filtered.length !== 1 && 's'} found</p>
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((d) => (
                <DoctorCard
                  key={d.id}
                  doctor={d}
                  selected={d.id === selectedId}
                  onBook={chooseDoctor}
                  onDetail={showDetail}
                  onMessage={showDetail}
                  bookLabel={d.id === selectedId ? 'Selected' : 'Book Now'}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* RIGHT – details */}
      <aside className="hidden xl:block">
        <div className="card sticky top-20 p-5">
          <h2 className="mb-4 text-lg font-bold">Detail Doctor</h2>
          {loading ? <LoadingBlock /> : <DoctorDetailPanel doctor={detailDoctor} onBook={chooseDoctor} compact />}
        </div>
      </aside>

      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="Detail Doctor">
        <DoctorDetailPanel
          doctor={detailDoctor}
          compact
          onBook={(d) => {
            setDetailModal(false)
            chooseDoctor(d)
          }}
        />
      </Modal>

      {confirmation && (
        <BookingConfirmation
          appointment={confirmation.appointment}
          doctor={confirmation.doctor}
          onClose={() => setConfirmation(null)}
        />
      )}
    </div>
  )
}

