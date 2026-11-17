import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Pencil, Plus, Search, Tags, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { filterDoctors, useDoctors } from '../../hooks/useDoctors'
import { cn, errorMessage, formatMoney } from '../../lib/utils'
import { Avatar, ConfirmDialog, EmptyState, ErrorState, LoadingBlock, Modal, PageHeader, Spinner, Stars } from '../../components/ui'

const EMPTY = { full_name: '', specialization: '', profile_image: '', experience: 0, consultation_fee: 20, biography: '', specialties: '', is_active: true }

export default function ManageDoctors() {
  const { doctors, specializations, loading, error, reload } = useDoctors({ includeInactive: true })
  const [tab, setTab] = useState('doctors')
  const [search, setSearch] = useState('')
  const [spec, setSpec] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const visible = useMemo(() => filterDoctors(doctors, { search, specialization: spec }), [doctors, search, spec])

  const remove = async () => {
    setBusy(true)
    try {
      if (deleting.kind === 'doctor') await api.deleteDoctor(deleting.item.id)
      else await api.deleteSpecialization(deleting.item.id)
      toast.success(`${deleting.kind === 'doctor' ? 'Doctor' : 'Specialization'} deleted`)
      setDeleting(null)
      reload()
    } catch (e) {
      toast.error(e.code === '23503' ? 'This specialization is still assigned to doctors. Reassign them first.' : errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div>
      <PageHeader
        title="Manage Doctors"
        subtitle="Add, edit and remove doctors and the specializations they belong to."
        actions={
          tab === 'doctors' ? (
            <button className="btn-primary" onClick={() => setEditing({ kind: 'doctor', item: { ...EMPTY, specialization: specializations[0]?.name || '' } })}>
              <Plus className="h-4 w-4" /> Add doctor
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setEditing({ kind: 'spec', item: { name: '', description: '' } })}>
              <Plus className="h-4 w-4" /> Add specialization
            </button>
          )
        }
      />

      <div className="mb-4 flex gap-1 rounded-xl bg-soft p-1 sm:w-fit">
        {[['doctors', 'Doctors', Users, doctors.length], ['specs', 'Specializations', Tags, specializations.length]].map(([k, label, Icon, n]) => (
          <button key={k} onClick={() => setTab(k)} className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold', tab === k ? 'bg-card shadow' : 'text-muted')}>
            <Icon className="h-4 w-4" /> {label} <span className="text-xs text-muted">{n}</span>
          </button>
        ))}
      </div>

      {loading ? <LoadingBlock /> : tab === 'doctors' ? (
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input pl-9" placeholder="Search doctors" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <select className="input sm:w-56" value={spec} onChange={(e) => setSpec(e.target.value)}>
              <option value="">All specializations</option>
              {specializations.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          {visible.length === 0 ? <EmptyState title="No doctors" message="Add your first doctor to get started." /> : (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead className="bg-soft">
                  <tr>
                    <th className="table-th">Doctor</th>
                    <th className="table-th">Specialization</th>
                    <th className="table-th">Experience</th>
                    <th className="table-th">Fee</th>
                    <th className="table-th">Rating</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((d) => (
                    <tr key={d.id} className="border-t border-line/60">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <Avatar src={d.profile_image} name={d.full_name} className="h-10 w-10" />
                          <Link to={`/doctors/${d.id}`} className="font-semibold hover:underline">{d.full_name}</Link>
                        </div>
                      </td>
                      <td className="table-td">{d.specialization}</td>
                      <td className="table-td">{d.experience} yrs</td>
                      <td className="table-td">{formatMoney(d.consultation_fee)}</td>
                      <td className="table-td">{d.review_count ? <div className="flex items-center gap-1.5"><Stars value={d.avg_rating} size="h-3.5 w-3.5" /><span className="text-xs text-muted">{d.avg_rating}</span></div> : <span className="text-xs text-muted">—</span>}</td>
                      <td className="table-td">
                        <span className={cn('chip', d.is_active ? 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200' : 'bg-soft text-muted')}>{d.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="table-td">
                        <div className="flex justify-end gap-1.5">
                          <Link to={`/admin/availability?doctor=${d.id}`} className="btn-outline btn-sm" title="Schedule"><CalendarRange className="h-3.5 w-3.5" /></Link>
                          <button className="btn-outline btn-sm" onClick={() => setEditing({ kind: 'doctor', item: { ...d, specialties: (d.specialties || []).join(', ') } })} title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                          <button className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10" onClick={() => setDeleting({ kind: 'doctor', item: d })} title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {specializations.map((s) => {
            const n = doctors.filter((d) => d.specialization === s.name).length
            return (
              <div key={s.id} className="card flex items-start gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Tags className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted">{s.description || 'No description'}</p>
                  <p className="mt-1 text-xs text-muted">{n} doctor{n !== 1 && 's'}</p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm" onClick={() => setEditing({ kind: 'spec', item: s })} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleting({ kind: 'spec', item: s })} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing?.kind === 'doctor' && <DoctorForm initial={editing.item} specializations={specializations} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}
      {editing?.kind === 'spec' && <SpecForm initial={editing.item} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload() }} />}

      <ConfirmDialog
        open={!!deleting}
        title={deleting?.kind === 'doctor' ? 'Delete doctor?' : 'Delete specialization?'}
        message={deleting?.kind === 'doctor'
          ? `${deleting.item.full_name} and all of their schedules, appointments and reviews will be permanently deleted. Consider marking the doctor inactive instead.`
          : `“${deleting?.item.name}” will be removed. This only works if no doctor uses it.`}
        confirmLabel="Delete"
        danger
        loading={busy}
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}

function DoctorForm({ initial, specializations, onClose, onSaved }) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const save = async () => {
    const e = {}
    if (form.full_name.trim().length < 3) e.full_name = 'Name is required (min 3 characters).'
    if (!form.specialization) e.specialization = 'Choose a specialization.'
    const exp = Number(form.experience)
    if (!Number.isInteger(exp) || exp < 0 || exp > 60) e.experience = 'Experience must be 0–60 years.'
    const fee = Number(form.consultation_fee)
    if (Number.isNaN(fee) || fee < 0) e.consultation_fee = 'Fee must be a positive number.'
    if (form.profile_image && !/^https?:\/\//.test(form.profile_image)) e.profile_image = 'Use an http(s) image URL.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await api.saveDoctor({
        ...form,
        full_name: form.full_name.trim(),
        experience: exp,
        consultation_fee: fee,
        profile_image: form.profile_image?.trim() || null,
        biography: form.biography?.trim() || null,
        specialties: String(form.specialties || '').split(',').map((s) => s.trim()).filter(Boolean),
      })
      toast.success(form.id ? 'Doctor updated' : 'Doctor added')
      onSaved()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const err = (k) => errors[k] && <p className="field-error">{errors[k]}</p>
  return (
    <Modal
      open
      onClose={onClose}
      title={form.id ? 'Edit doctor' : 'Add doctor'}
      size="max-w-2xl"
      footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />} Save</button></>}
    >
      <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
        <Avatar src={form.profile_image} name={form.full_name || 'Doctor'} className="h-32 w-28" rounded="rounded-2xl" />
        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className={cn('input', errors.full_name && 'input-error')} placeholder="Dr. Jane Doe" value={form.full_name} onChange={set('full_name')} />
            {err('full_name')}
          </div>
          <div>
            <label className="label">Profile image URL</label>
            <input className={cn('input', errors.profile_image && 'input-error')} placeholder="https://…" value={form.profile_image || ''} onChange={set('profile_image')} />
            {err('profile_image')}
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Specialization</label>
          <select className={cn('input', errors.specialization && 'input-error')} value={form.specialization} onChange={set('specialization')}>
            <option value="">Select…</option>
            {specializations.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          {err('specialization')}
        </div>
        <div>
          <label className="label">Experience (years)</label>
          <input type="number" min={0} max={60} className={cn('input', errors.experience && 'input-error')} value={form.experience} onChange={set('experience')} />
          {err('experience')}
        </div>
        <div>
          <label className="label">Consultation fee ($)</label>
          <input type="number" min={0} step="0.5" className={cn('input', errors.consultation_fee && 'input-error')} value={form.consultation_fee} onChange={set('consultation_fee')} />
          {err('consultation_fee')}
        </div>
      </div>
      <div className="mt-4">
        <label className="label">Medical specialties <span className="font-normal text-muted">(comma-separated)</span></label>
        <input className="input" placeholder="General Dermatology, Skin Allergy Treatment" value={form.specialties} onChange={set('specialties')} />
      </div>
      <div className="mt-4">
        <label className="label">Biography</label>
        <textarea rows={4} className="input" value={form.biography || ''} onChange={set('biography')} />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.is_active} onChange={set('is_active')} />
        Active (visible to patients and bookable)
      </label>
    </Modal>
  )
}

function SpecForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (form.name.trim().length < 2) return setError('Name is required.')
    setSaving(true)
    try {
      await api.saveSpecialization({ ...form, name: form.name.trim(), description: form.description?.trim() || null })
      toast.success('Specialization saved')
      onSaved()
    } catch (e) {
      toast.error(e.code === '23505' ? 'A specialization with this name already exists.' : errorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={form.id ? 'Edit specialization' : 'Add specialization'} footer={<><button className="btn-outline" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={saving}>{saving && <Spinner className="h-4 w-4 text-white" />} Save</button></>}>
      <div className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className={cn('input', error && 'input-error')} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError('') }} placeholder="e.g. Cardiologist" />
          {error && <p className="field-error">{error}</p>}
          {form.id && <p className="mt-1 text-xs text-muted">Renaming updates every doctor in this specialization automatically.</p>}
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={3} className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
    </Modal>
  )
}
