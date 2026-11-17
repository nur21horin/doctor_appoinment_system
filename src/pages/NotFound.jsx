import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-6xl font-extrabold text-brand-700">404</p>
        <h1 className="mt-2 text-xl font-bold">Page not found</h1>
        <p className="mt-1 text-sm text-muted">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary mt-6">Go home</Link>
      </div>
    </div>
  )
}
