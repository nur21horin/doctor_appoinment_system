import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, LogOut, Monitor, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'
import { cn, errorMessage } from '../lib/utils'
import { refreshNotifications } from '../components/Layout'
import { ConfirmDialog, PageHeader } from '../components/ui'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmClear, setConfirmClear] = useState(false)

  const useSystem = () => {
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    toast.success('Theme matched to your system')
  }

  const clear = async () => {
    try {
      await api.clearNotifications(user.id)
      refreshNotifications()
      toast.success('Notifications cleared')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setConfirmClear(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Settings" subtitle="Personalise how MediBook looks and behaves." />

      <section className="card p-5">
        <h2 className="font-bold">Appearance</h2>
        <p className="mb-4 text-sm text-muted">Choose a theme. Your choice is remembered on this device.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ['light', 'Light', Sun, () => setTheme('light')],
            ['dark', 'Dark', Moon, () => setTheme('dark')],
            ['system', 'Match system', Monitor, useSystem],
          ].map(([key, label, Icon, onClick]) => (
            <button
              key={key}
              onClick={onClick}
              className={cn('flex items-center gap-3 rounded-xl border p-4 text-left font-semibold transition', theme === key ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/10' : 'border-line hover:bg-soft')}
            >
              <Icon className="h-5 w-5" /> {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold">Notifications</h2>
          <p className="text-sm text-muted">Remove all booking and status notifications from your inbox.</p>
        </div>
        <button className="btn-outline" onClick={() => setConfirmClear(true)}><BellOff className="h-4 w-4" /> Clear notifications</button>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="font-bold">Session</h2>
          <p className="text-sm text-muted">Sign out of MediBook on this device.</p>
        </div>
        <button
          className="btn-danger"
          onClick={async () => {
            await signOut()
            navigate('/login')
          }}
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </section>

      <ConfirmDialog open={confirmClear} title="Clear all notifications?" message="This permanently removes every notification." confirmLabel="Clear" danger onConfirm={clear} onClose={() => setConfirmClear(false)} />
    </div>
  )
}
