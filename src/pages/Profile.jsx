import { useEffect, useState } from 'react'
import { KeyRound, Mail, Phone, Save, ShieldCheck, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { PHONE_RE, cn, errorMessage } from '../lib/utils'
import { PageHeader, Spinner } from '../components/ui'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ password: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
  }, [profile])

  const save = async (e) => {
    e.preventDefault()
    const errs = {}
    if (form.full_name.trim().length < 2) errs.full_name = 'Name must be at least 2 characters.'
    if (form.phone && !PHONE_RE.test(form.phone.trim())) errs.phone = 'Enter a valid phone number.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      await api.updateProfile(profile.id, { full_name: form.full_name.trim(), phone: form.phone.trim() || null })
      await refreshProfile()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    const errs = {}
    if (pw.password.length < 8) errs.password = 'Use at least 8 characters.'
    else if (!/[A-Za-z]/.test(pw.password) || !/\d/.test(pw.password)) errs.password = 'Include a letter and a number.'
    if (pw.confirm !== pw.password) errs.confirm = 'Passwords do not match.'
    setPwErrors(errs)
    if (Object.keys(errs).length) return
    setPwSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.password })
      if (error) throw error
      setPw({ password: '', confirm: '' })
      toast.success('Password changed')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Profile" subtitle="Manage your personal information and password." />
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="card h-fit p-5 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-100 text-3xl font-bold text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">
            {profile?.full_name?.[0]?.toUpperCase()}
          </div>
          <p className="mt-3 text-lg font-bold">{profile?.full_name}</p>
          <p className="text-sm text-muted">{profile?.email}</p>
          <span className="chip mt-3 bg-brand-100 capitalize text-brand-800 dark:bg-brand-500/15 dark:text-brand-200"><ShieldCheck className="h-3 w-3" /> {profile?.role}</span>
          <p className="mt-3 text-xs text-muted">Member since {profile && new Date(profile.created_at).toLocaleDateString()}</p>
        </div>

        <div className="space-y-5">
          <form onSubmit={save} className="card space-y-4 p-5" noValidate>
            <h2 className="font-bold">Personal information</h2>
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input className={cn('input pl-9', errors.full_name && 'input-error')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              {errors.full_name && <p className="field-error">{errors.full_name}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input className="input pl-9 opacity-70" value={profile?.email || ''} disabled />
                </div>
                <p className="mt-1 text-xs text-muted">Email can't be changed here.</p>
              </div>
              <div>
                <label className="label">Phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input className={cn('input pl-9', errors.phone && 'input-error')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                {errors.phone && <p className="field-error">{errors.phone}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn-primary" disabled={saving}>{saving ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />} Save changes</button>
            </div>
          </form>

          <form onSubmit={changePassword} className="card space-y-4 p-5" noValidate>
            <h2 className="font-bold">Change password</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">New password</label>
                <input type="password" autoComplete="new-password" className={cn('input', pwErrors.password && 'input-error')} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
                {pwErrors.password && <p className="field-error">{pwErrors.password}</p>}
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input type="password" autoComplete="new-password" className={cn('input', pwErrors.confirm && 'input-error')} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                {pwErrors.confirm && <p className="field-error">{pwErrors.confirm}</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <button className="btn-outline" disabled={pwSaving}>{pwSaving ? <Spinner className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />} Update password</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
