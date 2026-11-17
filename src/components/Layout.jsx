import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, CalendarClock, CalendarPlus, CheckCheck, ChevronLeft, ClipboardList, LayoutGrid, LogOut, Menu,
  Moon, Settings, Stethoscope, Sun, Trash2, User, UserRound, Users, X, Asterisk, CalendarRange,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'
import { cn, errorMessage } from '../lib/utils'

const PATIENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/book', label: 'Book Appointment', icon: CalendarPlus },
  { to: '/appointments', label: 'My Appointments', icon: CalendarClock },
  { to: '/doctors', label: 'Find Doctors', icon: Stethoscope },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/admin/appointments', label: 'Appointments', icon: ClipboardList },
  { to: '/admin/doctors', label: 'Manage Doctors', icon: Users },
  { to: '/admin/availability', label: 'Availability', icon: CalendarRange },
  { to: '/doctors', label: 'Doctor Directory', icon: Stethoscope },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const TITLES = [
  ['/admin/appointments', 'Manage Appointments'],
  ['/admin/doctors', 'Manage Doctors'],
  ['/admin/availability', 'Doctor Availability'],
  ['/admin', 'Admin Dashboard'],
  ['/dashboard', 'Dashboard'],
  ['/book', 'Appointment'],
  ['/appointments', 'My Appointments'],
  ['/doctors/', 'Doctor Details'],
  ['/doctors', 'Find Doctors'],
  ['/profile', 'Profile'],
  ['/settings', 'Settings'],
]

function Logo({ collapsed }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-1">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-300/90 text-brand-900">
        <Asterisk className="h-6 w-6" strokeWidth={3} />
      </div>
      {!collapsed && <span className="text-lg font-extrabold tracking-tight text-white">MediBook</span>}
    </Link>
  )
}

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const items = isAdmin ? ADMIN_NAV : PATIENT_NAV

  const logout = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar p-3 transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          collapsed ? 'lg:w-[76px]' : 'lg:w-60',
          mobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full',
        )}
      >
        <div className="flex items-center justify-between py-2">
          <Logo collapsed={collapsed && !mobileOpen} />
          <button className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-16 hidden h-6 w-6 place-items-center rounded-full border border-line bg-card text-ink shadow lg:grid"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn('h-4 w-4 transition', collapsed && 'rotate-180')} />
        </button>

        <p className={cn('mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40', collapsed && 'lg:text-center lg:px-0')}>
          Menu
        </p>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-white/15 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white',
                  collapsed && 'lg:justify-center lg:px-0',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          title="Logout"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 hover:bg-red-500/20 hover:text-white',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <LogOut className="h-5 w-5" />
          <span className={cn(collapsed && 'lg:hidden')}>Logout</span>
        </button>
      </aside>
    </>
  )
}

function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const ref = useRef(null)
  const unread = items.filter((n) => !n.is_read).length

  const load = () => user && api.notifications(user.id).then(setItems).catch(() => {})

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    const onRefresh = () => load()
    window.addEventListener('medibook:refresh-notifications', onRefresh)
    return () => {
      clearInterval(id)
      window.removeEventListener('medibook:refresh-notifications', onRefresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAll = async () => {
    try {
      await api.markNotificationsRead(user.id)
      setItems((xs) => xs.map((n) => ({ ...n, is_read: true })))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const clearAll = async () => {
    try {
      await api.clearNotifications(user.id)
      setItems([])
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-soft hover:text-ink"
        onClick={() => {
          setOpen((o) => !o)
          if (!open) load()
        }}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <div className="flex gap-1">
              <button className="btn-ghost btn-sm" onClick={markAll} title="Mark all read"><CheckCheck className="h-4 w-4" /></button>
              <button className="btn-ghost btn-sm" onClick={clearAll} title="Clear all"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="scrollbar-thin max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={cn('border-b border-line/60 px-4 py-3 last:border-0', !n.is_read && 'bg-brand-50/60 dark:bg-brand-500/5')}>
                  <p className="text-sm font-semibold capitalize">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted/70">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Topbar({ onMenu }) {
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { pathname } = useLocation()
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? 'MediBook'

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line/70 bg-bg/85 px-4 py-3 backdrop-blur sm:px-6">
      <button className="grid h-10 w-10 place-items-center rounded-xl hover:bg-soft lg:hidden" onClick={onMenu} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <div className="hidden items-center rounded-xl border border-line bg-card p-1 sm:flex">
          <button
            onClick={() => setTheme('light')}
            className={cn('grid h-8 w-8 place-items-center rounded-lg', theme === 'light' ? 'bg-brand-700 text-white' : 'text-muted')}
            aria-label="Light mode"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={cn('grid h-8 w-8 place-items-center rounded-lg', theme === 'dark' ? 'bg-brand-700 text-white' : 'text-muted')}
            aria-label="Dark mode"
          >
            <Moon className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-soft sm:hidden"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <Link to="/profile" className="flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-soft">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-200">
            <User className="h-5 w-5" />
          </div>
          <div className="hidden text-left leading-tight md:block">
            <p className="max-w-[10rem] truncate text-sm font-semibold">{profile?.full_name}</p>
            <p className="max-w-[10rem] truncate text-xs capitalize text-muted">{profile?.role}</p>
          </div>
        </Link>
      </div>
    </header>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export const refreshNotifications = () => window.dispatchEvent(new Event('medibook:refresh-notifications'))
