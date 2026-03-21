// src/pages/zone/ZoneDashboard.jsx
import { useState, useEffect } from 'react'
import { dashboardAPI, attendanceAPI, mockAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { ChevronRight, ChevronLeft, Users, Camera, CheckSquare, AlertTriangle, RefreshCw } from 'lucide-react'
import { Spinner, EmptyState, TrafficLight, SeverityBadge } from '../../components/common'
import { fmtDate, fmtTime, today } from '../../utils/helpers'
import Layout from '../../components/layout/Layout'

export default function ZoneDashboard() {
  const { user }    = useAuth()
  const [date,      setDate]      = useState(today())
  const [examType,  setExamType]  = useState('live')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null) // selected centre for drill down
  const [detail,    setDetail]    = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { loadDashboard() }, [date, examType])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await dashboardAPI.zone({ date, exam_type: examType })
      setData(res.data)
    } catch (e) {
      toast.error('Failed to load dashboard')
    } finally { setLoading(false) }
  }

  const loadDetail = async (centre_code) => {
    setSelected(centre_code)
    setDetailLoading(true)
    try {
      const res = await dashboardAPI.centre(centre_code, { date, exam_type: examType })
      setDetail(res.data)
    } catch (e) {
      toast.error('Failed to load centre detail')
    } finally { setDetailLoading(false) }
  }

  const statusPct = (c) => {
    const total   = parseInt(c.total_staff) || 0
    const reported = parseInt(c.staff_reported) || 0
    if (total === 0) return 0
    return Math.round((reported / total) * 100)
  }

  if (selected && detail) return (
    <Layout>
      <CentreDetail detail={detail} loading={detailLoading} examType={examType} onBack={() => { setSelected(null); setDetail(null) }} />
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Zone Admin</div>
            <h1 className="text-xl font-bold text-gray-900">{user.zone_name || 'My Zone'}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="input w-auto text-sm" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {['mock','live'].map(t => (
                <button key={t} onClick={() => setExamType(t)}
                  className={`px-4 py-2 text-xs font-bold capitalize transition-all ${examType === t ? (t === 'live' ? 'bg-red-600 text-white' : 'bg-blue-700 text-white') : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {t === 'mock' ? '📋' : '⚡'} {t}
                </button>
              ))}
            </div>
            <button onClick={loadDashboard} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* Summary Strip */}
            {data?.summary && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{data.summary.all_done}</div>
                  <div className="text-xs text-green-600 mt-1">All done</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-700">{data.summary.partial}</div>
                  <div className="text-xs text-amber-600 mt-1">Partial</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-red-700">{data.summary.not_started}</div>
                  <div className="text-xs text-red-600 mt-1">Not started</div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-400 mb-3">{data?.centres?.length || 0} centres · {examType} day · {fmtDate(date)}</div>

            {/* Centre Cards */}
            <div className="space-y-3">
              {data?.centres?.length === 0 && <EmptyState title="No centres found" desc="No data available for this date" />}
              {data?.centres?.map(c => {
                const pct     = statusPct(c)
                const border  = pct === 100 ? 'border-l-green-500' : pct > 0 ? 'border-l-amber-400' : 'border-l-red-500'
                const photos  = parseInt(c.photos_uploaded) || 0

                return (
                  <div key={c.centre_code}
                    onClick={() => loadDetail(c.centre_code)}
                    className={`card p-4 border-l-4 ${border} cursor-pointer hover:shadow-md transition-all`}>
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{c.centre_code} — {c.centre_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">SM: {c.primary_sm || '—'} · {c.server_count} server(s) · {c.total_capacity} seats</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <TrafficLight pct={pct} />
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <Stat label="Reported" val={`${c.staff_reported}/${c.total_staff}`} ok={c.staff_reported >= c.total_staff} />
                      <Stat label="Checklist" val={c.checklist_submitted ? '✓' : '✗'} ok={c.checklist_submitted} />
                      {examType === 'mock'
                        ? <Stat label="Photos" val={`${photos}/5`} ok={photos >= 5} />
                        : <Stat label="Issues" val={c.open_issues || 0} warn={parseInt(c.open_issues) > 0} />
                      }
                      <Stat label="Issues" val={c.open_issues || 0} warn={parseInt(c.open_issues) > 0} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

function Stat({ label, val, ok, warn }) {
  return (
    <div className="bg-gray-50 rounded-lg py-2 px-1">
      <div className={`text-sm font-bold ${ok ? 'text-green-600' : warn ? 'text-red-600' : 'text-gray-700'}`}>{val}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function CentreDetail({ detail, loading, examType, onBack }) {
  const [photoModal, setPhotoModal] = useState(null)

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!detail) return null

  const { centre, staff, checklist, photos, batches, issues } = detail

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 mb-4 font-semibold">
        <ChevronLeft className="h-4 w-4" /> Back to Zone
      </button>

      {/* Header */}
      <div className={`rounded-2xl p-4 mb-4 text-white ${examType === 'live' ? 'bg-red-700' : 'bg-blue-800'}`}>
        <div className="font-bold text-lg">{centre.centre_code} — {centre.centre_name}</div>
        <div className="text-sm opacity-80">{centre.city} · {centre.zone_name}</div>
      </div>

      {/* Staff Attendance */}
      <div className="card p-4 mb-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" /> Staff Attendance
        </div>
        <div className="space-y-2">
          {staff?.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                s.role === 'server_manager' ? (s.is_primary ? 'bg-red-600' : 'bg-blue-600') :
                s.role === 'event_manager' ? 'bg-amber-500' : 'bg-green-600'
              }`}>
                {s.role === 'server_manager' ? 'SM' : s.role === 'event_manager' ? 'EM' : 'BIO'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{s.full_name}</div>
                <div className="text-xs text-gray-400">{s.server_code || centre.centre_code} · {s.reported_at ? `Reported ${fmtTime(s.reported_at)}` : 'Not reported'}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <span className={`badge-${s.selfie_url ? 'green' : 'red'} text-xs`}>{s.selfie_url ? '✓' : '✗'} Selfie</span>
                <span className={`badge-${s.geo_lat ? 'green' : 'red'} text-xs`}>{s.geo_lat ? '✓' : '✗'} Geo</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Checklist */}
      {checklist && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> {examType === 'mock' ? 'Mock Checklist' : 'Live Checklist'}
          </div>
          {examType === 'mock' ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Centre name verified', checklist.centre_name_verified],
                ['Address verified',     checklist.centre_address_verified],
                ['CCTV available',       checklist.cctv_available],
                ['CCTV working',         checklist.cctv_working],
                ['UPS',                  checklist.ups_available],
                ['DG',                   checklist.dg_available],
                ['Partition',            checklist.partition_available],
                ['Drinking water',       checklist.drinking_water],
                ['Parking',              checklist.parking_available],
                ['Centre clean',         checklist.centre_clean],
                ['Restrooms',            checklist.restrooms_available],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                  <span className="text-gray-600 text-xs">{l}</span>
                  <span className={`text-xs font-bold ${v ? 'text-green-600' : 'text-red-500'}`}>{v ? 'Yes' : 'No'}</span>
                </div>
              ))}
              <div className="col-span-2 mt-2 grid grid-cols-2 gap-2">
                {[['Systems available', checklist.systems_available],['Systems tested', checklist.systems_tested],['Buffer systems', checklist.buffer_systems],['Network speed', checklist.network_speed]].map(([l,v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="font-bold text-gray-800">{v || '—'}</div>
                    <div className="text-xs text-gray-400">{l}</div>
                  </div>
                ))}
              </div>
              {checklist.final_remarks && (
                <div className="col-span-2 bg-blue-50 rounded-lg p-3 text-xs text-blue-800 mt-1">
                  <span className="font-semibold">Remarks:</span> {checklist.final_remarks}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Security reached</span><span className={`font-bold ${checklist.security_reached ? 'text-green-600' : 'text-red-500'}`}>{checklist.security_reached ? 'Yes' : 'No'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Male guards</span><span className="font-bold">{checklist.security_male_count}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Female guards</span><span className="font-bold">{checklist.security_female_count}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">HHMD available</span><span className={`font-bold ${checklist.hhmd_available ? 'text-green-600' : 'text-red-500'}`}>{checklist.hhmd_available ? 'Yes' : 'No'}</span></div>
              {checklist.remarks && <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 mt-1"><span className="font-semibold">Remarks:</span> {checklist.remarks}</div>}
            </div>
          )}
        </div>
      )}

      {/* Mock Photos */}
      {examType === 'mock' && photos?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Camera className="h-4 w-4" /> Centre Photos
          </div>
          <div className="grid grid-cols-5 gap-2">
            {['centre','lab1','lab2','cctv','network'].map(type => {
              const p = photos.find(ph => ph.photo_type === type)
              return (
                <div key={type} onClick={() => p && setPhotoModal(p.photo_url)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 ${p ? 'border-green-300 cursor-pointer hover:opacity-90' : 'border-dashed border-gray-200'} flex items-center justify-center`}>
                  {p ? <img src={p.photo_url} alt={type} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-300 text-center p-1">{type}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Batch Attendance (live) */}
      {examType === 'live' && batches?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Batch Attendance</div>
          <div className="space-y-2">
            {batches.map(b => (
              <div key={`${b.server_code}-${b.section_code}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="text-xs font-bold text-gray-500 w-16">{b.server_code}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{b.section_code}</span>
                    {b.is_submitted ? <span className="badge-green text-xs">Submitted</span> : <span className="badge-amber text-xs">Pending</span>}
                  </div>
                </div>
                <div className="flex gap-3 text-center">
                  <div><div className="text-sm font-bold">{b.registered || '—'}</div><div className="text-xs text-gray-400">Reg</div></div>
                  <div><div className="text-sm font-bold text-green-600">{b.present || '—'}</div><div className="text-xs text-gray-400">Present</div></div>
                  <div><div className="text-sm font-bold text-red-500">{b.absent || '—'}</div><div className="text-xs text-gray-400">Absent</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Issues Reported
          </div>
          <div className="space-y-2">
            {issues.map(issue => (
              <div key={issue.id} className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge s={issue.severity} />
                  <span className="text-sm font-semibold text-gray-800 capitalize">{issue.issue_type?.replace('_',' ')}</span>
                  {issue.section_code && <span className="badge-gray text-xs">{issue.section_code}</span>}
                </div>
                <div className="text-xs text-gray-600">{issue.description}</div>
                <div className="text-xs text-gray-400 mt-1">{issue.full_name} · {fmtTime(issue.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo modal */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <img src={photoModal} alt="preview" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  )
}
