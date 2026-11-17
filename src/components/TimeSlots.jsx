import { cn, formatTime } from '../lib/utils'
import { LoadingBlock } from './ui'

export default function TimeSlots({ slots, loading, value, onChange, emptyText = 'No time slots for this date.' }) {
  if (loading) return <LoadingBlock label="Checking availability…" className="py-6" />
  if (!slots?.length) return <p className="rounded-xl bg-soft px-4 py-6 text-center text-sm text-muted">{emptyText}</p>

  return (
    <div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {slots.map((s) => {
          const disabled = s.is_booked || s.is_past || !s.is_available
          const selected = value === s.slot_time
          const reason = s.is_booked ? 'Booked' : s.is_past ? 'Passed' : !s.is_available ? 'Unavailable' : ''
          return (
            <button
              key={s.slot_time}
              disabled={disabled}
              onClick={() => onChange(s.slot_time)}
              title={reason}
              className={cn(
                'rounded-xl border px-2 py-2.5 text-sm font-semibold transition',
                selected && 'border-brand-700 bg-brand-700 text-white shadow',
                !selected && !disabled && 'border-line bg-card hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10',
                disabled && 'cursor-not-allowed border-line/60 bg-soft text-muted/50 line-through',
              )}
            >
              {formatTime(s.slot_time)}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-line bg-card" /> Available</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-brand-700" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-soft ring-1 ring-line" /> Booked / unavailable</span>
      </div>
    </div>
  )
}
