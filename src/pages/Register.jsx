import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { EMAIL_RE, PHONE_RE, cn, errorMessage } from '../lib/utils'
import { Spinner } from '../components/ui'
import AuthShell from './AuthShell'

export default function Register() {
  const { signUp, user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirm: '', agree: false })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user && profile) return <Navigate to="/" replace />

  const validate = () => {
    const e = {}
    if (form.fullName.trim().length < 2) e.fullName = 'Please enter your full name.'
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.'
    if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Enter a valid phone number (7–20 digits).'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Include at least one letter and one number.'
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match.'
    if (!form.agree) e.agree = 'Please accept the terms to continue.'
    setErrors(e)
    return !Object.keys(e).length
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const data = await signUp({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      })
      if (data.session) {
        toast.success('Account created — welcome to MediBook!')
        navigate('/dashboard', { replace: true })
      } else {
        toast.success('Account created! Check your email to confirm, then sign in.', { duration: 6000 })
        navigate('/login', { replace: true })
      }
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const Field = ({ id, label, type = 'text', placeholder, autoComplete }) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type={type} autoComplete={autoComplete} placeholder={placeholder} className={cn('input', errors[id] && 'input-error')} value={form[id]} onChange={set(id)} />
      {errors[id] && <p className="field-error">{errors[id]}</p>}
    </div>
  )

  return (
    <AuthShell title="Create your patient account" subtitle="It takes less than a minute.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {Field({ id: 'fullName', label: 'Full name', placeholder: 'Razaa Ahmed', autoComplete: 'name' })}
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ id: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com', autoComplete: 'email' })}
          {Field({ id: 'phone', label: 'Phone number', type: 'tel', placeholder: '+8801XXXXXXXXX', autoComplete: 'tel' })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Field({ id: 'password', label: 'Password', type: 'password', placeholder: 'Min. 8 characters', autoComplete: 'new-password' })}
          {Field({ id: 'confirm', label: 'Confirm password', type: 'password', placeholder: 'Repeat password', autoComplete: 'new-password' })}
        </div>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-700" checked={form.agree} onChange={set('agree')} />
          I agree to MediBook's terms and consent to my appointment data being stored by the clinic.
        </label>
        {errors.agree && <p className="field-error -mt-2">{errors.agree}</p>}
        <button className="btn-primary w-full py-3" disabled={submitting}>
          {submitting ? <Spinner className="h-4 w-4 text-white" /> : <UserPlus className="h-4 w-4" />} Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already registered? <Link to="/login" className="font-semibold text-brand-700 hover:underline dark:text-brand-300">Sign in</Link>
      </p>
    </AuthShell>
  )
}
