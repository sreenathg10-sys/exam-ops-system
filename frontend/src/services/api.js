// src/services/api.js
import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
})

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('examops_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handler
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('examops_token')
      localStorage.removeItem('examops_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login:         (data)  => api.post('/auth/login', data),
  me:            ()      => api.get('/auth/me'),
  todaySchedule: ()      => api.get('/auth/today-schedule'),
}

// ── Attendance ────────────────────────────────────────────────
export const attendanceAPI = {
  my:       ()     => api.get('/attendance/my'),
  report:   (data) => api.post('/attendance/report', data),
  geo:      (data) => api.post('/attendance/geo', data),
  submit:   ()     => api.post('/attendance/submit'),
  uploadSelfie: (file) => {
    const fd = new FormData()
    fd.append('selfie', file)
    return api.post('/attendance/selfie', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  centre: (code, date) => api.get(`/attendance/centre/${code}`, { params: { date } }),
}

// ── Mock ──────────────────────────────────────────────────────
export const mockAPI = {
  submitChecklist: (data)  => api.post('/mock/checklist', data),
  getChecklist:    (code, date) => api.get(`/mock/checklist/${code}`, { params: { date } }),
  uploadPhoto: (photoType, file) => {
    const fd = new FormData()
    fd.append('photo', file)
    fd.append('photo_type', photoType)
    return api.post('/mock/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getPhotos: (code, date) => api.get(`/mock/photos/${code}`, { params: { date } }),
}

// ── Live ──────────────────────────────────────────────────────
export const liveAPI = {
  submitChecklist:  (data)       => api.post('/live/checklist', data),
  getChecklist:     (code, date) => api.get(`/live/checklist/${code}`, { params: { date } }),
  submitBatch:      (data)       => api.post('/live/batch', data),
  getBatch:         (code, date) => api.get(`/live/batch/${code}`, { params: { date } }),
}

// ── Issues ────────────────────────────────────────────────────
export const issuesAPI = {
  report: (formData) => api.post('/issues', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  centre: (code, date) => api.get(`/issues/centre/${code}`, { params: { date } }),
  all:    (params)     => api.get('/issues/all', { params }),
  updateStatus: (id, status) => api.patch(`/issues/${id}/status`, { status }),
}

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardAPI = {
  zone:   (params) => api.get('/dashboard/zone',   { params }),
  master: (params) => api.get('/dashboard/master', { params }),
  centre: (code, params) => api.get(`/dashboard/centre/${code}`, { params }),
}

// ── Reports ───────────────────────────────────────────────────
export const reportsAPI = {
  zoneSummary:   (params) => api.get('/reports/zone-summary',  { params, responseType: 'blob' }),
  centreDetail:  (params) => api.get('/reports/centre-detail', { params, responseType: 'blob' }),
}

// ── Config ────────────────────────────────────────────────────
export const configAPI = {
  import: (file) => {
    const fd = new FormData()
    fd.append('excel', file)
    return api.post('/config/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  status:    () => api.get('/config/status'),
  importLog: () => api.get('/config/import-log'),
  template:  () => api.get('/config/template', { responseType: 'blob' }),
}

export default api
