import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, toISODate } from '../lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * Month calendar.
 * - month: Date (any day within the displayed month)
 * - value: 'YYYY-MM-DD' selected date
 * - availableDates: Map/Set of ISO dates that have free slots (others are dimmed/disabled)
 *   pass null to allow every non-past date.
 */
export default function Calendar({ month, onMonthChange, value, onChange, availableDates = null, loading }) {
  const year = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(year, m, 1)
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const todayISO = toISODate(new Date())
  const now = new Date()
  const canGoBack = year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth())

  const cells = []
  for (let i = 0; i < first.getDay(); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d))

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <div className="flex gap-1.5">
          <button
            className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-soft disabled:opacity-40"
            onClick={() => onMonthChange(new Date(year, m - 1, 1))}
            disabled={!canGoBack}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="grid h-8 w-8 place-items-center rounded-lg border border-line hover:bg-soft"
            onClick={() => onMonthChange(new Date(year, m + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className={cn('grid grid-cols-7 gap-y-1 text-center', loading && 'opacity-60')}>
        {DAYS.map((d) => (
          <div key={d} className="pb-1 text-xs font-medium text-muted">{d}</div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />
          const iso = toISODate(date)
          const past = iso < todayISO
          const hasSlots = availableDates ? availableDates.has(iso) : !past
          const disabled = past || !hasSlots
          const selected = iso === value
          return (
            <div key={iso} className="flex justify-center">
              <button
                disabled={disabled}
                onClick={() => onChange(iso)}
                title={availableDates && !past ? (hasSlots ? `${availableDates.get?.(iso) ?? ''} free slots` : 'No availability') : ''}
                className={cn(
                  'relative grid h-9 w-9 place-items-center rounded-xl text-sm transition',
                  selected && 'bg-brand-700 font-bold text-white shadow',
                  !selected && !disabled && 'font-semibold hover:bg-brand-50 dark:hover:bg-brand-500/10',
                  disabled && 'text-muted/40',
                  iso === todayISO && !selected && 'ring-1 ring-brand-400',
                )}
              >
                {date.getDate()}
                {availableDates && hasSlots && !past && !selected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500" />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
