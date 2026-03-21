// src/components/layout/Layout.jsx
import { useAuth } from '../../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Menu, X, Bell } from 'lucide-react'
import { useState } from 'react'
import { getRoleLabel } from '../../utils/helpers'

const roleColor = {
  master_admin:    'bg-purple-700',
  zone_admin:      'bg-blue-700',
  server_manager:  'bg-red-700',
  event_manager:   'bg-amber-600',
  biometric_staff: 'bg-green-700',
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">EO</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-gray-900 leading-tight">ExamOps</div>
              <div className="text-xs text-gray-500">Monitoring System</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-semibold text-gray-800">{user.full_name || user.username}</div>
                  <div className="text-xs text-gray-500">{getRoleLabel(user.role)}</div>
                </div>
                <div className={`w-8 h-8 rounded-full ${roleColor[user.role] || 'bg-gray-600'} flex items-center justify-center text-white text-xs font-bold`}>
                  {(user.full_name || user.username)?.[0]?.toUpperCase()}
                </div>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}
