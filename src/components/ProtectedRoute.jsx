import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { FullPageSpinner } from './ui'

/** Guards a route. role = 'admin' | 'patient' | undefined (any signed-in user). */
export default function ProtectedRoute({ role, children }) {
  const { user, profile, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (user && !profile)
    return (
      <div className="grid min-h-full place-items-center p-6 text-center">
        <div className="card max-w-md p-8">
          <h1 className="text-lg font-bold">Profile not found</h1>
          <p className="mt-2 text-sm text-muted">
            Your account has no MediBook profile. Make sure <code>schema.sql</code> was run before creating users.
          </p>
          <button className="btn-primary mt-5" onClick={signOut}>Sign out</button>
        </div>
      </div>
    )
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (role === 'admin' && profile.role !== 'admin') return <Navigate to="/dashboard" replace />
  if (role === 'patient' && profile.role === 'admin') return <Navigate to="/admin" replace />
  return children
}
