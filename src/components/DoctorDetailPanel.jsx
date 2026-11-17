import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, BriefcaseMedical, ExternalLink, GraduationCap, Sparkles, Tag } from 'lucide-react'
import { api } from '../lib/api'
import { formatMoney } from '../lib/utils'
import { Avatar, EmptyState, LoadingBlock, Stars } from './ui'

export default function DoctorDetailPanel({ doctor, onBook, compact }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!doctor) return
    let alive = true
    setLoading(true)
    api
      .listReviews(doctor.id)
      .then((r) => alive && setReviews(r))
      .catch(() => alive && setReviews([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [doctor?.id])

  if (!doctor) return <EmptyState title="No doctor selected" message="Choose a doctor to see their profile, specialties and reviews." />

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div className="space-y-5">
      <Avatar src={doctor.profile_image} name={doctor.full_name} className="aspect-[4/3] w-full" rounded="rounded-2xl" />
      <div>
        <h2 className="text-xl font-bold">{doctor.full_name}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
          <span className="flex items-center gap-1.5"><BriefcaseMedical className="h-4 w-4" /> {doctor.specialization}</span>
          <span className="flex items-center gap-1.5"><Tag className="h-4 w-4" /> {formatMoney(doctor.consultation_fee)}/visit</span>
          <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> {doctor.experience} years</span>
        </div>
      </div>

      <section>
        <h3 className="mb-1.5 flex items-center gap-2 font-semibold"><GraduationCap className="h-4 w-4" /> Experience</h3>
        <p className="text-sm leading-relaxed text-muted">{doctor.biography || 'No biography provided yet.'}</p>
      </section>

      {doctor.specialties?.length > 0 && (
        <section>
          <h3 className="mb-1.5 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4" /> Speciality</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted">
            {doctor.specialties.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Reviews</h3>
          {reviews.length > 0 && <span className="text-xs text-muted">{avg.toFixed(1)} · {reviews.length} review{reviews.length > 1 && 's'}</span>}
        </div>
        {loading ? (
          <LoadingBlock className="py-4" />
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {(compact ? reviews.slice(0, 2) : reviews).map((r) => (
              <div key={r.id} className="rounded-xl bg-soft p-3">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} size="h-3.5 w-3.5" />
                  <span className="text-xs text-muted">{r.patient_name}</span>
                </div>
                {r.comment && <p className="mt-1.5 text-sm italic text-muted">“{r.comment}”</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-2">
        {onBook && <button className="btn-primary flex-1" onClick={() => onBook(doctor)}>Book Appointment</button>}
        {compact && (
          <Link to={`/doctors/${doctor.id}`} className="btn-outline" title="Open full profile"><ExternalLink className="h-4 w-4" /></Link>
        )}
      </div>
    </div>
  )
}
