import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { errorMessage } from '../lib/utils'

export function useDoctors(opts = {}) {
  const [doctors, setDoctors] = useState([])
  const [specializations, setSpecializations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [docs, specs] = await Promise.all([api.listDoctors(opts), api.listSpecializations()])
      setDoctors(docs)
      setSpecializations(specs)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.includeInactive])

  useEffect(() => {
    load()
  }, [load])

  return { doctors, specializations, loading, error, reload: load }
}

/** Client-side filtering used by the doctor lists. */
export function filterDoctors(doctors, { search = '', specialization = '' }) {
  const q = search.trim().toLowerCase()
  return doctors.filter(
    (d) =>
      (!specialization || d.specialization === specialization) &&
      (!q ||
        d.full_name.toLowerCase().includes(q) ||
        d.specialization.toLowerCase().includes(q) ||
        (d.specialties || []).some((s) => s.toLowerCase().includes(q))),
  )
}
