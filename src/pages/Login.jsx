import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { EMAIL_RE, cn, errorMessage } from '../lib/utils'
import { Spinner } from '../components/ui'
import AuthShell from './AuthShell'

const DEMOS = [
  ['Patient demo', 'razaa@medibook.com', 'Patient@123'],
  ['Admin demo', 'admin@medibook.com', 'Admin@123'],
]

export default function Login() {
  const { signIn, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user && profile) return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />

  const validate = () => {
    const e = {}
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.'
    if (!form.password) e.password = 'Password is required.'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const p = await signIn(form.email.trim(), form.password)
      toast.success(`Welcome back${p?.full_name ? `, ${p.full_name.split(' ')[0]}` : ''}!`)
      const from = location.state?.from
      navigate(p?.role === 'admin' ? (from?.startsWith('/admin') ? from : '/admin') : from && !from.startsWith('/admin') ? from : '/dashboard', { replace: true })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your appointments.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className={cn('input', errors.email && 'input-error')} value={form.email} onChange={set('email')} placeholder="you@example.com" />
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className={cn('input pr-10', errors.password && 'input-error')} value={form.password} onChange={set('password')} placeholder="••••••••" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setShow((s) => !s)} aria-label="Toggle password visibility">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="field-error">{errors.password}</p>}
        </div>
        <button className="btn-primary w-full py-3" disabled={submitting}>
          {submitting ? <Spinner className="h-4 w-4 text-white" /> : <LogIn className="h-4 w-4" />} Sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New patient? <Link to="/register" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Create an account</Link>
      </p>

      <div className="mt-8 rounded-2xl border border-dashed border-line p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMOS.map(([label, email, password]) => (
            <button key={email} type="button" className="btn-outline btn-sm flex-col items-start py-2 text-left" onClick={() => setForm({ email, password })}>
              <span>{label}</span>
              <span className="font-normal text-muted">{email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}
