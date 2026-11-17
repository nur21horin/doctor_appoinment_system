import { useEffect, useState } from 'react'
import { AlertTriangle, Inbox, Loader2, Star, X } from 'lucide-react'
import { STATUS_STYLES, avatarFallback, cn } from '../lib/utils'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={cn('animate-spin text-brand-600', className)} />
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-full place-items-center p-10">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function LoadingBlock({ label = 'Loading…', className = '' }) {
  return (
    <div className={cn('flex items-center justify-center gap-3 py-12 text-sm text-muted', className)}>
      <Spinner /> {label}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, message, action, className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Couldn't load this"
      message={message}
      action={onRetry && <button className="btn-outline btn-sm" onClick={onRetry}>Try again</button>}
    />
  )
}

export function Avatar({ src, name, className = 'h-12 w-12', rounded = 'rounded-xl' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return (
    <img
      src={!src || failed ? avatarFallback(name) : src}
      alt={name}
      onError={() => setFailed(true)}
      className={cn('shrink-0 bg-soft object-cover', rounded, className)}
      loading="lazy"
    />
  )
}

export function StatusBadge({ status }) {
  return <span className={cn('chip capitalize', STATUS_STYLES[status])}>{status}</span>
}

export function Stars({ value = 0, size = 'h-4 w-4', onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(i)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <Star className={cn(size, i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-line')} />
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={cn('card flex max-h-[92vh] w-full flex-col rounded-b-none sm:rounded-2xl', size)}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-bold">{title}</h2>
            <button className="btn-ghost btn-sm" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
        )}
        <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose} disabled={loading}>Back</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner className="h-4 w-4 text-white" />} {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  )
}

export function StatCard({ icon: Icon, label, value, tone = 'brand', hint }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  }
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value ?? '–'}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
