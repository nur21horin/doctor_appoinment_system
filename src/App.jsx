import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { FullPageSpinner } from './components/ui'
import Login from './pages/Login'
import Register from './pages/Register'
import PatientDashboard from './pages/PatientDashboard'
import BookAppointment from './pages/BookAppointment'
import FindDoctors from './pages/FindDoctors'
import DoctorDetails from './pages/DoctorDetails'
import MyAppointments from './pages/MyAppointments'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import SetupNotice from './pages/SetupNotice'
import AdminDashboard from './pages/admin/AdminDashboard'
import ManageDoctors from './pages/admin/ManageDoctors'
import ManageAvailability from './pages/admin/ManageAvailability'
import ManageAppointments from './pages/admin/ManageAppointments'

function HomeRedirect() {
  const { user, isAdmin, loading, profile } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user || !profile) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
}

export default function App() {
  if (!isConfigured) return <SetupNotice />

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Patient area */}
      <Route element={<ProtectedRoute role="patient"><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<PatientDashboard />} />
        <Route path="/book" element={<BookAppointment />} />
        <Route path="/appointments" element={<MyAppointments />} />
      </Route>

      {/* Shared signed-in area */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/doctors" element={<FindDoctors />} />
        <Route path="/doctors/:id" element={<DoctorDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Admin area */}
      <Route element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/doctors" element={<ManageDoctors />} />
        <Route path="/admin/availability" element={<ManageAvailability />} />
        <Route path="/admin/appointments" element={<ManageAppointments />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
