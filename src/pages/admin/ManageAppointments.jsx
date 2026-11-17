import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Eye, RefreshCw, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { STATUSES, cn, errorMessage, formatDate, formatTime, shortId } from '../../lib/utils'
import { Avatar, ConfirmDialog, EmptyState, ErrorState, LoadingBlock, Modal, PageHeader, StatusBadge } from '../../components/ui'

export default function ManageAppointments() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')

  const status = params.get('status') || ''
  const doctorId = params.get('doctor') || ''
  const from = params.get('from') || ''
  const to = params.get('to') || ''

  const setFilter = (k, v) =>
    setParams((p) => {
      if (v) p.set(k, v)
      else p.delete(k)
      return p
    }, { replace: true })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await api.allAppointments({ status, doctorId, from, to }))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [status, doctorId, from, to])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.listDoctors({ includeInactive: true }).then(setDoctors).catch(() => {}) }, [])

  const q = search.trim().toLowerCase()
  const visible = useMemo(
    () => items.filter((a) => !q || a.patient?.full_name?.toLowerCase().includes(q) || a.patient?.email?.toLowerCase().includes(q) || a.doctor?.full_name?.toLowerCase().includes(q) || a.id.startsWith(q.replace('#', ''))),
    [items, q],
  )

  const setStatus = async (a, next) => {
    setBusy(a.id)
    try {
      const updated = await api.setAppointmentStatus(a.id, next)
      setItems((xs) => xs.map((x) => (x.id === a.id ? { ...x, status: updated.status } : x)))
      if (viewing?.id === a.id) setViewing((v) => ({ ...v, status: updated.status }))
      toast.success(`Appointment ${shortId(a.id)} marked ${next}`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const ask = (a, next) => (next === 'cancelled' ? setConfirm({ a, next }) : setStatus(a, next))

  return (
    <div>
      <PageHeader
        title="Manage Appointments"
        subtitle="Confirm, reject, complete or cancel patient appointments."
        actions={<button className="btn-outline" onClick={load}><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh</button>}
      />

      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search patient, doctor or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" value={doctorId} onChange={(e) => setFilter('doctor', e.target.value)}>
          <option value="">All doctors</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <div className="flex gap-2 xl:col-span-2">
          <input type="date" className="input" value={from} onChange={(e) => setFilter('from', e.target.value)} title="From date" />
          <input type="date" className="input" value={to} onChange={(e) => setFilter('to', e.target.value)} title="To date" />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-5">
          {['', ...STATUSES].map((s) => (
            <button key={s || 'all'} onClick={() => setFilter('status', s)} className={cn('chip border px-3 py-1.5 text-sm capitalize', status === s ? 'border-brand-700 bg-brand-700 text-white' : 'border-line hover:bg-soft')}>
              {s || 'All statuses'}
            </button>
          ))}
          {(status || doctorId || from || to) && (
            <button className="btn-ghost btn-sm ml-auto" onClick={() => setParams({}, { replace: true })}>Clear filters</button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <LoadingBlock /> : error ? <ErrorState message={error} onRetry={load} /> : visible.length === 0 ? (
          <EmptyState title="No appointments found" message="Adjust the filters to see more results." />
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-soft">
                <tr>
                  <th className="table-th">ID</th>
                  <th className="table-th">Patient</th>
                  <th className="table-th">Doctor</th>
                  <th className="table-th">Date & time</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Quick actions</th>
                  <th className="table-th">Set status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className={cn('border-t border-line/60', busy === a.id && 'opacity-50')}>
                    <td className="table-td font-mono text-xs">{shortId(a.id)}</td>
                    <td className="table-td">
                      <p className="font-semibold">{a.patient?.full_name}</p>
                      <p className="text-xs text-muted">{a.patient?.phone || a.patient?.email}</p>
                    </td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <Avatar src={a.doctor?.profile_image} name={a.doctor?.full_name} className="h-8 w-8" rounded="rounded-lg" />
                        <div>
                          <p className="font-medium">{a.doctor?.full_name}</p>
                          <p className="text-xs text-muted">{a.doctor?.specialization}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td whitespace-nowrap">{formatDate(a.appointment_date)}<br /><span className="text-xs text-muted">{formatTime(a.appointment_time)}</span></td>
                    <td className="table-td"><StatusBadge status={a.status} /></td>
                    <td className="table-td">
                      <div className="flex gap-1.5">
                        <button className="btn-outline btn-sm" onClick={() => setViewing(a)} title="View details"><Eye className="h-3.5 w-3.5" /></button>
                        {a.status === 'pending' && (
                          <>
                            <button className="btn-primary btn-sm" disabled={busy === a.id} onClick={() => setStatus(a, 'confirmed')}><Check className="h-3.5 w-3.5" /> Confirm</button>
                            <button className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10" disabled={busy === a.id} onClick={() => ask(a, 'cancelled')}><X className="h-3.5 w-3.5" /> Reject</button>
                          </>
                        )}
                        {a.status === 'confirmed' && (
                          <button className="btn-outline btn-sm" disabled={busy === a.id} onClick={() => setStatus(a, 'completed')}>Complete</button>
                        )}
                      </div>
                    </td>
                    <td className="table-td">
                      <select className="input w-32 py-1.5 text-xs capitalize" value={a.status} disabled={busy === a.id} onChange={(e) => ask(a, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && <p className="mt-2 text-xs text-muted">{visible.length} appointment{visible.length !== 1 && 's'}</p>}

      <ConfirmDialog
        open={!!confirm}
        title="Cancel / reject appointment?"
        message={confirm && `Appointment ${shortId(confirm.a.id)} for ${confirm.a.patient?.full_name} will be cancelled and the patient notified. The slot becomes available again.`}
        confirmLabel="Cancel appointment"
        danger
        loading={busy === confirm?.a.id}
        onConfirm={() => setStatus(confirm.a, confirm.next)}
        onClose={() => setConfirm(null)}
      />

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing && `Appointment ${shortId(viewing.id)}`}>
        {viewing && (
          <div className="space-y-3 text-sm">
            {[
              ['Patient', `${viewing.patient?.full_name} · ${viewing.patient?.email}`],
              ['Phone', viewing.patient?.phone || '—'],
              ['Doctor', `${viewing.doctor?.full_name} (${viewing.doctor?.specialization})`],
              ['Date', formatDate(viewing.appointment_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
              ['Time', formatTime(viewing.appointment_time)],
              ['Booked', new Date(viewing.created_at).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2"><span className="text-muted">{k}</span><span className="text-right font-medium">{v}</span></div>
            ))}
            <div>
              <p className="mb-1 text-muted">Patient concerns</p>
              <p className="whitespace-pre-wrap rounded-lg bg-soft p-3">{viewing.patient_concerns || '—'}</p>
            </div>
            <div>
              <p className="mb-2 text-muted">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} disabled={busy === viewing.id || viewing.status === s} onClick={() => ask(viewing, s)} className={cn('btn-sm btn border capitalize', viewing.status === s ? 'border-brand-700 bg-brand-700 text-white' : 'border-line hover:bg-soft')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
