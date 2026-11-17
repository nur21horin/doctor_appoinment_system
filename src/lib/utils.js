export const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed']

export const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  confirmed: 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  completed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
}

// Validated with the dataviz palette checker (light + dark): CVD-separable, fixed order.
export const STATUS_COLORS = {
  pending: '#d97706',
  confirmed: '#0f9a8c',
  completed: '#4f46e5',
  cancelled: '#dc2626',
}
export const CHART_ORDER = ['pending', 'confirmed', 'completed', 'cancelled']

/** Local YYYY-MM-DD (avoids the UTC shift of toISOString). */
export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatDate(s, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!s) return ''
  const d = typeof s === 'string' ? parseISODate(s.slice(0, 10)) : s
  return d.toLocaleDateString('en-GB', opts)
}

export function formatMoney(n) {
  return `BDT ${Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
}

export function shortId(id) {
  return id ? `#${id.slice(0, 8).toUpperCase()}` : ''
}

export function isPastAppointment(a) {
  const dt = new Date(`${a.appointment_date}T${a.appointment_time}`)
  return dt.getTime() < Date.now()
}

/** Turn Supabase / Postgres errors into a friendly sentence. */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  let msg = err.message || err.error_description || String(err)
  if (err.code === '23505') return 'This slot has already been booked. Please choose another time.'
  msg = msg.replace(/^SLOT_TAKEN:\s*/, '')
  if (/Invalid login credentials/i.test(msg)) return 'Incorrect email or password.'
  if (/Failed to fetch/i.test(msg)) return 'Cannot reach the server. Check your connection and Supabase settings.'
  return msg || fallback
}

export const isSlotTakenError = (err) =>
  err?.code === '23505' || /SLOT_TAKEN|already been booked/i.test(err?.message || '')

export function avatarFallback(name = '?') {
  const initials = name
    .replace(/^(Dr\.|Prof\.)\s*/i, '')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=d7f2ee&color=17423f&bold=true&size=256`
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const PHONE_RE = /^[+0-9 ()-]{7,20}$/

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
