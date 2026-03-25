// src/utils/helpers.js
import { format } from 'date-fns'

export const today = () => format(new Date(), 'yyyy-MM-dd')

// Display format DD-MM-YYYY throughout UI
export const fmtDate     = (d) => d ? format(new Date(d), 'dd-MM-yyyy') : '—'
export const fmtTime     = (d) => d ? format(new Date(d), 'hh:mm a') : '—'
export const fmtDateTime = (d) => d ? format(new Date(d), 'dd-MM-yyyy, hh:mm a') : '—'

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const getRoleLabel = (role) => ({
  master_admin:    'Master Admin',
  zone_admin:      'Zone Admin',
  server_manager:  'Server Manager',
  event_manager:   'Event Manager',
  biometric_staff: 'Biometric Staff',
}[role] || role)

export const getSeverityColor = (s) => ({
  critical: 'badge-red',
  high:     'badge-red',
  medium:   'badge-amber',
  low:      'badge-blue',
}[s] || 'badge-gray')

export const getStatusColor = (pct) => {
  if (pct === 100) return 'green'
  if (pct > 0)    return 'amber'
  return 'red'
}
