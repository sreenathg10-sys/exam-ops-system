// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PageLoader } from './components/common'
import LoginPage      from './pages/auth/LoginPage'
import MasterDashboard from './pages/master/MasterDashboard'
import ZoneDashboard   from './pages/zone/ZoneDashboard'
import StaffPage       from './pages/staff/AttendancePage'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user)   return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user)   return <Navigate to="/login" replace />
  if (user.role === 'master_admin') return <Navigate to="/master" replace />
  if (user.role === 'zone_admin')   return <Navigate to="/zone"   replace />
  return <Navigate to="/staff" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '10px', fontSize: '14px' },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/"      element={<RootRedirect />} />
          <Route path="/master" element={
            <ProtectedRoute roles={['master_admin']}>
              <MasterDashboard />
            </ProtectedRoute>
          } />
          <Route path="/zone" element={
            <ProtectedRoute roles={['zone_admin']}>
              <ZoneDashboard />
            </ProtectedRoute>
          } />
          <Route path="/staff" element={
            <ProtectedRoute roles={['server_manager','event_manager','biometric_staff']}>
              <StaffPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
