import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import DoctorCard from './DoctorCard'
import { LoadingBlock } from './ui'

/**
 * Bonus feature: rule-based recommendations from the `recommend_doctors` RPC.
 * Ranking (server side): has open slots → earliest slot → experience → rating.
 */
export default function RecommendedDoctors({ specialization, limit = 2, onBook, onDetail, doctorsById = {}, refreshKey }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (specialization === undefined) return
    let alive = true
    setLoading(true)
    api
      .recommendDoctors(specialization)
      .then((rows) => alive && setItems(rows))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [specialization, refreshKey])

  const top = items.filter((r) => r.next_date).slice(0, limit)

  return (
    <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-transparent p-4 dark:border-brand-800 dark:from-brand-500/10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-brand-800 dark:text-brand-200">
          <Sparkles className="h-5 w-5" /> Recommended for You
        </h2>
        <p className="text-xs text-muted">
          {specialization ? `Best available ${specialization}s` : 'Soonest available doctors'} · ranked by availability, earliest slot & experience
        </p>
      </div>
      {loading ? (
        <LoadingBlock className="py-6" label="Finding the best match…" />
      ) : top.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">No doctors with open slots in the next two weeks for this specialization.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {top.map((r) => {
            const doctor = doctorsById[r.doctor_id] || {
              id: r.doctor_id, full_name: r.full_name, specialization: r.specialization, profile_image: r.profile_image,
              experience: r.experience, consultation_fee: r.consultation_fee, avg_rating: r.avg_rating,
            }
            return <DoctorCard key={r.doctor_id} doctor={doctor} recommendation={r} onBook={onBook} onDetail={onDetail} />
          })}
        </div>
      )}
    </section>
  )
}
