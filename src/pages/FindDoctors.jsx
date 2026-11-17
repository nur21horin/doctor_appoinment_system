import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Search, Stethoscope } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { filterDoctors, useDoctors } from '../hooks/useDoctors'
import { cn } from '../lib/utils'
import DoctorCard from '../components/DoctorCard'
import RecommendedDoctors from '../components/RecommendedDoctors'
import { EmptyState, ErrorState, LoadingBlock, PageHeader } from '../components/ui'

const SORTS = {
  name: (a, b) => a.full_name.localeCompare(b.full_name),
  experience: (a, b) => b.experience - a.experience,
  fee: (a, b) => a.consultation_fee - b.consultation_fee,
  rating: (a, b) => b.avg_rating - a.avg_rating,
}

export default function FindDoctors() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { doctors, specializations, loading, error, reload } = useDoctors()
  const [search, setSearch] = useState(params.get('q') || '')
  const [sort, setSort] = useState('name')
  const specialization = params.get('specialization') || ''

  const setSpec = (s) => setParams(s ? { specialization: s } : {}, { replace: true })
  const byId = useMemo(() => Object.fromEntries(doctors.map((d) => [d.id, d])), [doctors])
  const results = useMemo(() => [...filterDoctors(doctors, { search, specialization })].sort(SORTS[sort]), [doctors, search, specialization, sort])

  const counts = useMemo(() => doctors.reduce((m, d) => ({ ...m, [d.specialization]: (m[d.specialization] || 0) + 1 }), {}), [doctors])
  const book = isAdmin ? null : (d) => navigate(`/book?doctor=${d.id}`)
  const detail = (d) => navigate(`/doctors/${d.id}`)

  if (error) return <ErrorState message={error} onRetry={reload} />

  return (
    <div className="space-y-5">
      <PageHeader title="Find Doctors" subtitle="Search by name or filter by specialization to find the right specialist." />

      <div className="card space-y-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Search by doctor name, specialization or condition…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="relative md:w-52">
            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <select className="input pl-9" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="experience">Sort: Most experienced</option>
              <option value="fee">Sort: Lowest fee</option>
              <option value="rating">Sort: Top rated</option>
            </select>
          </div>
        </div>
        <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button onClick={() => setSpec('')} className={cn('chip shrink-0 border px-3 py-1.5 text-sm', !specialization ? 'border-brand-700 bg-brand-700 text-white' : 'border-line hover:bg-soft')}>
            All ({doctors.length})
          </button>
          {specializations.map((s) => (
            <button
              key={s.id}
              onClick={() => setSpec(s.name)}
              title={s.description}
              className={cn('chip shrink-0 border px-3 py-1.5 text-sm', specialization === s.name ? 'border-brand-700 bg-brand-700 text-white' : 'border-line hover:bg-soft')}
            >
              {s.name} ({counts[s.name] || 0})
            </button>
          ))}
        </div>
      </div>

      {specialization && !isAdmin && (
        <RecommendedDoctors specialization={specialization} doctorsById={byId} onBook={book} onDetail={detail} />
      )}

      {loading ? (
        <LoadingBlock label="Loading doctors…" />
      ) : results.length === 0 ? (
        <div className="card"><EmptyState icon={Stethoscope} title="No matching doctors" message="Try another search term or specialization." /></div>
      ) : (
        <>
          <p className="text-sm text-muted">Showing {results.length} of {doctors.length} doctors</p>
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {results.map((d) => (
              <DoctorCard key={d.id} doctor={d} onBook={book || detail} onDetail={detail} bookLabel={isAdmin ? 'View profile' : 'Book Now'} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
