import { Asterisk, CalendarCheck2, ShieldCheck, Stethoscope } from 'lucide-react'

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-300 text-brand-900"><Asterisk className="h-6 w-6" strokeWidth={3} /></div>
          <span className="text-2xl font-extrabold">MediBook</span>
        </div>
        <div className="my-auto max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">Book the right doctor, at the right time — online.</h2>
          <p className="mt-4 text-white/70">No more queues to check availability. See real-time schedules and reserve your slot in seconds.</p>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              [Stethoscope, 'Find specialists and compare experience, fees & reviews'],
              [CalendarCheck2, 'Live availability — booked slots are never double-booked'],
              [ShieldCheck, 'Secure accounts with private appointment history'],
            ].map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"><Icon className="h-5 w-5" /></span>{text}
              </li>
            ))}
          </ul>
        </div>
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sidebar text-brand-300"><Asterisk className="h-6 w-6" strokeWidth={3} /></div>
            <span className="text-xl font-extrabold">MediBook</span>
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
