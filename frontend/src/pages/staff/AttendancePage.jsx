// src/pages/staff/AttendancePage.jsx
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import { attendanceAPI, authAPI, liveAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { CheckCircle, MapPin, Camera, Clock } from 'lucide-react'
import { Spinner, YesNo } from '../../components/common'
import { fmtTime } from '../../utils/helpers'
import MockChecklistTab from './MockChecklistTab'
import LiveSessionTab from './LiveSessionTab'
import ReportIssueTab from './ReportIssueTab'
import Layout from '../../components/layout/Layout'
import { CheckCircle as Check, ClipboardList, Zap, AlertTriangle } from 'lucide-react'

export default function StaffPage() {
  const { user }  = useAuth()
  const [schedule,    setSchedule]    = useState(null)
  const [attendance,  setAttendance]  = useState(null)
  const [activeTab,   setActiveTab]   = useState('attendance')
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)
  const [liveChecklistSaved, setLiveChecklistSaved] = useState(false)
  const [liveForm, setLiveForm] = useState({
    security_reached: null, security_male_count: '', security_female_count: '', hhmd_available: null, remarks: ''
  })

  // is_primary comes from the me endpoint
  const isPrimarySM = user?.role === 'server_manager' && user?.is_primary === true

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [schRes, attRes] = await Promise.all([
        authAPI.todaySchedule(),
        attendanceAPI.my(),
      ])
      setSchedule(schRes.data.schedule)
      setAttendance(attRes.data.attendance)
    } catch (e) {
      toast.error('Failed to load data')
    } finally { setLoading(false) }
  }

  const examType = schedule?.exam_type || null

  // ── Tab definitions based on role + exam type ──────────────
  const getTabs = () => {
    if (isPrimarySM) {
      if (examType === 'mock') return [
        { id: 'attendance', label: 'Attendance',   icon: Check },
        { id: 'mock',       label: 'Mock Exam',    icon: ClipboardList },
        { id: 'issues',     label: 'Report Issue', icon: AlertTriangle },
      ]
      if (examType === 'live') return [
        { id: 'attendance', label: 'Attendance',   icon: Check },
        { id: 'live',       label: 'Live Session', icon: Zap },
        { id: 'issues',     label: 'Report Issue', icon: AlertTriangle },
      ]
    }
    // Non-primary SM — live session tab on live day
    if (user?.role === 'server_manager' && !isPrimarySM) {
      if (examType === 'live') return [
        { id: 'attendance', label: 'Attendance',   icon: Check },
        { id: 'live',       label: 'Live Session', icon: Zap },
        { id: 'issues',     label: 'Report Issue', icon: AlertTriangle },
      ]
    }
    // EM, Bio Staff, non-primary SM on mock day — attendance + issues only
    return [
      { id: 'attendance', label: 'Attendance',   icon: Check },
      { id: 'issues',     label: 'Report Issue', icon: AlertTriangle },
    ]
  }

  const tabs = getTabs()

  const handleReported = async () => {
    setSubmitting(true)
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      ).catch(() => null)
      await attendanceAPI.report({
        geo_lat:   pos?.coords.latitude  || null,
        geo_lng:   pos?.coords.longitude || null,
        exam_type: examType || 'live',
      })
      toast.success('Reported to centre confirmed!')
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to mark reported')
    } finally { setSubmitting(false) }
  }

  const handleSelfie = async (file) => {
    if (!file) return
    setSubmitting(true)
    try {
      await attendanceAPI.uploadSelfie(file)
      toast.success('Selfie uploaded!')
      loadData()
    } catch (e) {
      toast.error('Selfie upload failed')
    } finally { setSubmitting(false) }
  }

  const handleGeo = async () => {
    setSubmitting(true)
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      )
      await attendanceAPI.geo({ geo_lat: pos.coords.latitude, geo_lng: pos.coords.longitude })
      toast.success('Location saved!')
      loadData()
    } catch (e) {
      toast.error('Could not get location. Please allow location access.')
    } finally { setSubmitting(false) }
  }

  const handleSubmitAttendance = async () => {
    if (!attendance?.reported_at) return toast.error('Please mark reported to centre first')
    if (!attendance?.selfie_url)  return toast.error('Please upload selfie first')
    if (!attendance?.geo_lat)     return toast.error('Please save geo location first')
    setSubmitting(true)
    try {
      await attendanceAPI.submit()
      toast.success('Attendance submitted!')
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submit failed')
    } finally { setSubmitting(false) }
  }

  const handleSaveLiveChecklist = async () => {
    setSubmitting(true)
    try {
      await liveAPI.submitChecklist(liveForm)
      toast.success('Live checklist saved!')
      setLiveChecklistSaved(true)
    } catch (e) {
      toast.error('Failed to save checklist')
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className={`rounded-2xl p-4 mb-4 text-white ${
          examType === 'live' ? 'bg-red-700' : examType === 'mock' ? 'bg-blue-800' : 'bg-gray-700'
        }`}>
          <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
            {examType === 'live' ? 'LIVE DAY' : examType === 'mock' ? 'MOCK DAY' : 'TODAY'} —{' '}
            {user.role.replace(/_/g, ' ').toUpperCase()}
            {isPrimarySM && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">PRIMARY</span>}
          </div>
          <div className="font-bold text-lg">{user.centre_name || user.server_code || '—'}</div>
          <div className="text-sm opacity-80">{user.server_code} · {user.full_name}</div>
        </div>

        {/* No schedule */}
        {!schedule && (
          <div className="card p-6 text-center text-gray-400 mb-4">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-gray-600">No exam scheduled today</p>
            <p className="text-sm mt-1">Check back on your exam date</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4 gap-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === id ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="h-4 w-4" />
              <span>{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* ── ATTENDANCE TAB ── */}
        {activeTab === 'attendance' && (
          <div className="space-y-3">
            {/* Step 1 — Reported */}
            <div className="card p-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Step 1 — Arrival</div>
              {attendance?.reported_at ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-800">Reported to centre</div>
                    <div className="text-xs text-green-600 mt-0.5">Confirmed at {fmtTime(attendance.reported_at)}</div>
                  </div>
                </div>
              ) : (
                <button onClick={handleReported} disabled={submitting}
                  className="w-full border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-5 text-center transition-all hover:bg-blue-50 disabled:opacity-50">
                  {submitting ? <Spinner size="sm" /> : (
                    <>
                      <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <div className="font-semibold text-gray-700">Reported to Centre</div>
                      <div className="text-xs text-gray-400 mt-1">Tap to confirm your arrival</div>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Step 2 — Selfie + Geo */}
            <div className="card p-4">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Step 2 — Attendance</div>
              <div className="grid grid-cols-2 gap-3">
                {/* Selfie */}
                <label className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                  attendance?.selfie_url ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                }`}>
                  <input type="file" accept="image/*" capture="user" className="hidden"
                    onChange={e => handleSelfie(e.target.files[0])} />
                  {attendance?.selfie_url ? (
                    <>
                      <img src={attendance.selfie_url} alt="selfie" className="h-16 w-16 rounded-full object-cover" />
                      <CheckCircle className="h-4 w-4 text-green-600 mt-2" />
                    </>
                  ) : (
                    <>
                      <Camera className="h-8 w-8 text-gray-300 mb-2" />
                      <span className="text-xs text-gray-500">Take Selfie</span>
                    </>
                  )}
                </label>

                {/* Geo */}
                <button onClick={handleGeo} disabled={submitting || !!attendance?.geo_lat}
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 transition-all ${
                    attendance?.geo_lat ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  } disabled:cursor-not-allowed`}>
                  {attendance?.geo_lat ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
                      <span className="text-xs text-green-700 font-semibold">Geo Saved</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-8 w-8 text-gray-300 mb-2" />
                      <span className="text-xs text-gray-500">Geo Tag</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 3 — Live checklist for Primary SM on live day */}
            {isPrimarySM && examType === 'live' && (
              <div className="card p-4 space-y-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 3 — Security & Equipment</div>
                <div>
                  <label className="label">Security guards reached</label>
                  <YesNo val={liveForm.security_reached} onChange={v => setLiveForm(f => ({ ...f, security_reached: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Male count</label>
                    <input className="input" type="number" min="0" value={liveForm.security_male_count}
                      onChange={e => setLiveForm(f => ({ ...f, security_male_count: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Female count</label>
                    <input className="input" type="number" min="0" value={liveForm.security_female_count}
                      onChange={e => setLiveForm(f => ({ ...f, security_female_count: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">HHMD available</label>
                  <YesNo val={liveForm.hhmd_available} onChange={v => setLiveForm(f => ({ ...f, hhmd_available: v }))} />
                </div>
                <div>
                  <label className="label">Remarks</label>
                  <textarea className="input h-16 resize-none" value={liveForm.remarks}
                    onChange={e => setLiveForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional…" />
                </div>
                {!liveChecklistSaved ? (
                  <button onClick={handleSaveLiveChecklist} disabled={submitting} className="btn-danger w-full">
                    {submitting ? <Spinner size="sm" /> : 'Save Live Checklist'}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Live Checklist Saved</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit attendance */}
            {!attendance?.is_submitted ? (
              <button onClick={handleSubmitAttendance}
                disabled={submitting || !attendance?.reported_at || !attendance?.selfie_url || !attendance?.geo_lat}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                  examType === 'live' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'
                } disabled:opacity-40 disabled:cursor-not-allowed`}>
                {submitting ? <Spinner size="sm" /> : 'Submit Attendance'}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-700">Attendance Submitted</span>
              </div>
            )}
          </div>
        )}

        {/* ── MOCK TAB (Primary SM only) ── */}
        {activeTab === 'mock' && isPrimarySM && <MockChecklistTab user={user} />}

        {/* ── LIVE SESSION TAB (Primary SM + non-primary SM) ── */}
        {activeTab === 'live' && user?.role === 'server_manager' && <LiveSessionTab user={user} />}

        {/* ── ISSUES TAB ── */}
        {activeTab === 'issues' && <ReportIssueTab user={user} examType={examType} />}
      </div>
    </Layout>
  )
}
