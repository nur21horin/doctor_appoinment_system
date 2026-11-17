import { Award, BriefcaseMedical, MessageSquareText, Sparkles, Star, Tag } from 'lucide-react'
import { cn, formatDate, formatMoney, formatTime } from '../lib/utils'
import { Avatar } from './ui'

export default function DoctorCard({ doctor, selected, onBook, onDetail, onMessage, recommendation, bookLabel = 'Book Now' }) {
  return (
    <div
      className={cn(
        'card flex flex-col p-3.5 transition hover:-translate-y-0.5 hover:shadow-lg',
        selected && 'ring-2 ring-brand-500',
        recommendation && 'border-brand-300 dark:border-brand-700',
      )}
    >
      <div className="flex gap-3.5">
        <Avatar src={doctor.profile_image} name={doctor.full_name} className="h-24 w-20 sm:h-28 sm:w-24" />
        <div className="min-w-0 flex-1 space-y-1.5 pt-1">
          {recommendation && (
            <span className="chip bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200">
              <Sparkles className="h-3 w-3" /> Recommended for You
            </span>
          )}
          <h3 className="truncate text-[15px] font-bold">{doctor.full_name}</h3>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <BriefcaseMedical className="h-4 w-4 shrink-0" /> <span className="truncate">{doctor.specialization}</span>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Tag className="h-4 w-4 shrink-0" /> {formatMoney(doctor.consultation_fee)}/visit
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Award className="h-4 w-4" /> {doctor.experience} yrs</span>
            {doctor.avg_rating > 0 && (
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {Number(doctor.avg_rating).toFixed(1)}</span>
            )}
          </p>
        </div>
      </div>
      {recommendation && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
          {recommendation.next_date
            ? <>Earliest: {formatDate(recommendation.next_date, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(recommendation.next_time)} · {recommendation.free_slots} open slots</>
            : 'No open slots in the next 2 weeks'}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button className="btn-primary btn-sm flex-1 py-2" onClick={() => onBook?.(doctor)}>{bookLabel}</button>
        <button className="btn-outline btn-sm flex-1 py-2" onClick={() => onDetail?.(doctor)}>Detail</button>
        {onMessage && (
          <button className="btn-outline btn-sm px-2.5" onClick={() => onMessage(doctor)} title="Reviews">
            <MessageSquareText className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
