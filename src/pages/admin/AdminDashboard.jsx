import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { CalendarCheck2, CalendarDays, CheckCircle2, ClipboardList, Clock3, RefreshCw, Stethoscope, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'
import { CHART_ORDER, STATUS_COLORS, addDays, cn, errorMessage, formatDate, formatTime, toISODate } from '../../lib/utils'
import { Avatar, EmptyState, ErrorState, LoadingBlock, PageHeader, StatCard, StatusBadge } from '../../components/ui'

const RANGES = {
  last7: { label: 'Last 7 days', from: -6, to: 0 },
  last14: { label: 'Last 14 days', from: -13, to: 0 },
  last30: { label: 'Last 30 days', from: -29, to: 0 },
  next14: { label: 'Next 14 days', from: 0, to: 13 },
  around: { label: '±7 days', from: -7, to: 7 },
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{formatDate(label, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
      {[...payload].reverse().map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 capitalize text-muted"><span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />{p.dataKey}</span>
          <span className="font-semibold text-ink">{p.value}</span>
        </p>
      ))}
      <p className="mt-1 flex justify-between border-t border-line pt-1 font-semibold"><span>Total</span><span>{total}</span></p>
    </div>
  )
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [recent, setRecent] = useState([])
  const [range, setRange] = useState('around')
  const [selectedDay, setSelectedDay] = useState(toISODate(new Date()))
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(false)
  const [error, setError] = useState(null)
  const [view, setView] = useState('chart')

  const loadCore = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, r] = await Promise.all([api.adminSummary(), api.recentAppointments(6)])
      setSummary(s)
      setRecent(r)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDaily = useCallback(async () => {
    setChartLoading(true)
    const { from, to } = RANGES[range]
    const today = new Date()
    try {
      setDaily(await api.dailyStats(toISODate(addDays(today, from)), toISODate(addDays(today, to))))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setChartLoading(false)
    }
  }, [range])

  useEffect(() => { loadCore() }, [loadCore])
  useEffect(() => { loadDaily() }, [loadDaily])

  const refresh = () => {
    loadCore()
    loadDaily()
  }

  const totals = useMemo(
    () => CHART_ORDER.map((k) => ({ name: k, value: daily.reduce((s, d) => s + d[k], 0) })),
    [daily],
  )
  const dayRow = daily.find((d) => d.day === selectedDay)

  if (error) return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle={`Overview for ${formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}
        actions={
          <>
            <button className="btn-outline" onClick={refresh}><RefreshCw className={cn('h-4 w-4', (loading || chartLoading) && 'animate-spin')} /> Refresh</button>
            <Link to="/admin/appointments?status=pending" className="btn-primary"><ClipboardList className="h-4 w-4" /> Review pending</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-6">
        <StatCard icon={Stethoscope} label="Total doctors" value={summary?.doctors} />
        <StatCard icon={Users} label="Total patients" value={summary?.patients} tone="violet" />
        <StatCard icon={ClipboardList} label="Total appointments" value={summary?.appointments} tone="sky" />
        <StatCard icon={Clock3} label="Pending" value={summary?.pending} tone="amber" />
        <StatCard icon={CalendarCheck2} label="Confirmed" value={summary?.confirmed} />
        <StatCard icon={CalendarDays} label="Appointments today" value={summary?.today} tone="red" hint={summary && `${summary.completed} completed overall`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <h2 className="text-lg font-bold">Daily appointment statistics</h2>
              <p className="text-xs text-muted">Appointments per day by status · click a bar to inspect that day</p>
            </div>
            <div className="flex rounded-xl bg-soft p-1 text-xs">
              {['chart', 'table'].map((v) => (
                <button key={v} onClick={() => setView(v)} className={cn('rounded-lg px-3 py-1.5 font-semibold capitalize', view === v ? 'bg-card shadow' : 'text-muted')}>{v}</button>
              ))}
            </div>
            <select className="input w-auto py-2 text-xs" value={range} onChange={(e) => setRange(e.target.value)}>
              {Object.entries(RANGES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </div>

          {chartLoading && !daily.length ? (
            <LoadingBlock className="h-72" />
          ) : view === 'chart' ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={daily}
                  margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                  onClick={(e) => e?.activeLabel && setSelectedDay(e.activeLabel)}
                  barCategoryGap="22%"
                >
                  <CartesianGrid vertical={false} stroke="rgb(var(--line))" strokeDasharray="0" />
                  <XAxis dataKey="day" tickFormatter={(d) => formatDate(d, { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--soft))' }} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, textTransform: 'capitalize' }} />
                  {CHART_ORDER.map((k, i) => (
                    <Bar
                      key={k}
                      dataKey={k}
                      stackId="s"
                      fill={STATUS_COLORS[k]}
                      stroke="rgb(var(--card))"
                      strokeWidth={1}
                      radius={i === CHART_ORDER.length - 1 ? [4, 4, 0, 0] : 0}
                      maxBarSize={28}
                      cursor="pointer"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="scrollbar-thin max-h-72 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-line">
                    <th className="table-th">Date</th>
                    {CHART_ORDER.map((k) => <th key={k} className="table-th text-right capitalize">{k}</th>)}
                    <th className="table-th text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.day} className="border-b border-line/50">
                      <td className="table-td">{formatDate(d.day)}</td>
                      {CHART_ORDER.map((k) => <td key={k} className="table-td text-right">{d[k]}</td>)}
                      <td className="table-td text-right font-semibold">{d.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-soft p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Breakdown for {formatDate(selectedDay, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <input type="date" className="input w-auto py-1.5 text-xs" value={selectedDay} onChange={(e) => e.target.value && setSelectedDay(e.target.value)} />
            </div>
            {dayRow ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[['total', dayRow.total], ...CHART_ORDER.map((k) => [k, dayRow[k]])].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-card p-3">
                    <p className="flex items-center gap-1.5 text-xs capitalize text-muted">
                      {k !== 'total' && <span className="h-2 w-2 rounded-sm" style={{ background: STATUS_COLORS[k] }} />}{k}
                    </p>
                    <p className="text-xl font-bold">{v}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">This date is outside the selected range — pick a range that includes it.</p>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-lg font-bold">Status distribution</h2>
          <p className="mb-2 text-xs text-muted">{RANGES[range].label}</p>
          {totals.every((t) => !t.value) ? (
            <EmptyState title="No appointments in range" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={totals} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="rgb(var(--card))" strokeWidth={2}>
                    {totals.map((t) => <Cell key={t.name} fill={STATUS_COLORS[t.name]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n.charAt(0).toUpperCase() + n.slice(1)]} contentStyle={{ borderRadius: 12, border: '1px solid rgb(var(--line))', background: 'rgb(var(--card))', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-2 space-y-2 text-sm">
            {totals.map((t) => (
              <li key={t.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 capitalize"><span className="h-3 w-3 rounded-sm" style={{ background: STATUS_COLORS[t.name] }} />{t.name}</span>
                <span className="font-semibold">{t.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent appointments</h2>
          <Link to="/admin/appointments" className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">Manage all</Link>
        </div>
        {loading ? <LoadingBlock /> : recent.length === 0 ? <EmptyState title="No appointments yet" /> : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="table-th">Patient</th>
                  <th className="table-th">Doctor</th>
                  <th className="table-th">Date & time</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id} className="border-b border-line/50 last:border-0">
                    <td className="table-td">
                      <p className="font-semibold">{a.patient?.full_name}</p>
                      <p className="text-xs text-muted">{a.patient?.email}</p>
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
                    <td className="table-td">{formatDate(a.appointment_date)}<br /><span className="text-xs text-muted">{formatTime(a.appointment_time)}</span></td>
                    <td className="table-td"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="flex items-center gap-1.5 text-xs text-muted"><CheckCircle2 className="h-3.5 w-3.5" /> Statistics are computed in the database via the <code>get_daily_stats</code> function.</p>
    </div>
  )
}
