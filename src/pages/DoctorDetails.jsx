import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { addDays, cn, errorMessage, formatDate, formatTime, toISODate } from '../lib/utils'
import DoctorDetailPanel from '../components/DoctorDetailPanel'
import { ErrorState, LoadingBlock } from '../components/ui'

export default function DoctorDetails() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [days, setDays] = useState([])
  const [activeDay, setActiveDay] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const today = new Date()
      const [doc, dates] = await Promise.all([api.getDoctor(id), api.getAvailableDates(id, today, addDays(today, 13))])
      setDoctor(doc)
      setDays(dates)
      setActiveDay(dates[0]?.available_date ?? null)
    } catch (e) {
      setError(errorMessage(e, 'Doctor not found.'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!activeDay) return setSlots([])
    setSlotsLoading(true)
    api.getSlots(id, activeDay).then(setSlots).catch(() => setSlots([])).finally(() => setSlotsLoading(false))
  }, [id, activeDay])

  if (loading) return <LoadingBlock label="Loading profile…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  const freeMap = new Map(days.map((d) => [d.available_date, d.free_slots]))
  const twoWeeks = Array.from({ length: 14 }, (_, i) => toISODate(addDays(new Date(), i)))

  return (
    <div className="space-y-4">
      <button className="btn-ghost -ml-2" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</button>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="card h-fit p-5">
          <DoctorDetailPanel doctor={doctor} onBook={isAdmin ? null : () => navigate(`/book?doctor=${doctor.id}`)} />
        </div>
        <div className="card h-fit p-5">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold"><CalendarDays className="h-5 w-5" /> Availability – next 14 days</h2>
          <p className="mb-4 text-sm text-muted">Dates with open slots are highlighted. Booked and past times are crossed out.</p>
          <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
            {twoWeeks.map((iso) => {
              const free = freeMap.get(iso) || 0
              return (
                <button
                  key={iso}
                  disabled={!free}
                  onClick={() => setActiveDay(iso)}
                  className={cn(
                    'flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-xs transition',
                    activeDay === iso ? 'border-brand-700 bg-brand-700 text-white' : free ? 'border-line hover:border-brand-400' : 'border-line/50 text-muted/50',
                  )}
                >
                  <span>{formatDate(iso, { weekday: 'short' })}</span>
                  <span className="text-lg font-bold">{formatDate(iso, { day: 'numeric' })}</span>
                  <span>{free ? `${free} free` : '—'}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-4">
            {!activeDay ? (
              <p className="rounded-xl bg-soft p-6 text-center text-sm text-muted">No availability in the next two weeks.</p>
            ) : slotsLoading ? (
              <LoadingBlock className="py-6" />
            ) : (
              <>
                <p className="mb-2 font-semibold">{formatDate(activeDay, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {slots.map((s) => {
                    const off = s.is_booked || s.is_past || !s.is_available
                    return (
                      <Link
                        key={s.slot_time}
                        to={off || isAdmin ? '#' : `/book?doctor=${id}`}
                        onClick={(e) => (off || isAdmin) && e.preventDefault()}
                        className={cn(
                          'rounded-lg border px-2 py-2 text-center text-xs font-semibold',
                          off ? 'cursor-not-allowed border-line/50 bg-soft text-muted/50 line-through' : 'border-line hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10',
                        )}
                      >
                        {formatTime(s.slot_time)}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
