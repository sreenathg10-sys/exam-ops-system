// src/pages/master/ZoneDrillDown.jsx
import { useState, useEffect } from 'react'
import { dashboardAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Spinner, EmptyState, TrafficLight, SeverityBadge } from '../../components/common'
import { fmtDate, fmtTime } from '../../utils/helpers'
import ZoneDashboard from '../zone/ZoneDashboard'
import { useAuth } from '../../context/AuthContext'

export default function ZoneDrillDown({ zone, date, examType, onBack }) {
  const { user } = useAuth()
  // Temporarily set zone context and show zone dashboard
  // We reuse the ZoneDashboard component by overriding the zone data
  const [data,      setData]    = useState(null)
  const [loading,   setLoading] = useState(true)
  const [selected,  setSelected] = useState(null)
  const [detail,    setDetail]   = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      // Use zone admin endpoint but with zone_id override via master admin
      const res = await dashboardAPI.zone({ date, exam_type: examType, zone_id_override: zone.id })
      setData(res.data)
    } catch (e) {
      toast.error('Failed to load zone data')
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

  if (selected && detail) return (
    <CentreDetailView detail={detail} loading={detailLoading} examType={examType} onBack={() => { setSelected(null); setDetail(null) }} />
  )

  const statusPct = (c) => {
    const total   = parseInt(c.total_staff) || 0
    const reported = parseInt(c.staff_reported) || 0
    if (total === 0) return 0
    return Math.round((reported / total) * 100)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 mb-4 font-semibold">
        <ChevronLeft className="h-4 w-4" /> Back to Pan India
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{zone.state}</div>
          <h2 className="text-xl font-bold text-gray-900">{zone.zone_name}</h2>
        </div>
        <div className="text-sm text-gray-500">{fmtDate(date)} · {examType}</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
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

          <div className="space-y-3">
            {data?.centres?.map(c => {
              const pct    = statusPct(c)
              const border = pct === 100 ? 'border-l-green-500' : pct > 0 ? 'border-l-amber-400' : 'border-l-red-500'
              return (
                <div key={c.centre_code}
                  onClick={() => loadDetail(c.centre_code)}
                  className={`card p-4 border-l-4 ${border} cursor-pointer hover:shadow-md transition-all`}>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{c.centre_code} — {c.centre_name}</div>
                      <div className="text-xs text-gray-400">{c.city} · {c.server_count} server(s) · {c.total_capacity} seats</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TrafficLight pct={pct} />
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Reported',  val: `${c.staff_reported}/${c.total_staff}`, ok: c.staff_reported >= c.total_staff },
                      { label: 'Checklist', val: c.checklist_submitted ? '✓' : '✗', ok: c.checklist_submitted },
                      { label: 'Photos',    val: examType === 'mock' ? `${c.photos_uploaded || 0}/5` : '—', ok: parseInt(c.photos_uploaded) >= 5 },
                      { label: 'Issues',    val: c.open_issues || 0, warn: parseInt(c.open_issues) > 0 },
                    ].map(({ label, val, ok, warn }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-2">
                        <div className={`text-sm font-bold ${ok ? 'text-green-600' : warn ? 'text-red-600' : 'text-gray-700'}`}>{val}</div>
                        <div className="text-xs text-gray-400">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function CentreDetailView({ detail, loading, examType, onBack }) {
  const [photoModal, setPhotoModal] = useState(null)
  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>
  if (!detail) return null
  const { centre, staff, checklist, photos, batches, issues } = detail

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 mb-4 font-semibold">
        <ChevronLeft className="h-4 w-4" /> Back to Zone
      </button>
      <div className={`rounded-2xl p-4 mb-4 text-white ${examType === 'live' ? 'bg-red-700' : 'bg-blue-800'}`}>
        <div className="font-bold text-lg">{centre.centre_code} — {centre.centre_name}</div>
        <div className="text-sm opacity-80">{centre.city} · {centre.zone_name}</div>
      </div>

      {/* Staff */}
      <div className="card p-4 mb-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Staff Attendance</div>
        <div className="space-y-2">
          {staff?.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${s.role === 'server_manager' ? (s.is_primary ? 'bg-red-600' : 'bg-blue-600') : s.role === 'event_manager' ? 'bg-amber-500' : 'bg-green-600'}`}>
                {s.role === 'server_manager' ? 'SM' : s.role === 'event_manager' ? 'EM' : 'BIO'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{s.full_name}</div>
                <div className="text-xs text-gray-400">{s.server_code || centre.centre_code} · {s.reported_at ? `Reported ${fmtTime(s.reported_at)}` : 'Not reported'}</div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded ${s.selfie_url ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.selfie_url ? '✓' : '✗'}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${s.geo_lat ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.geo_lat ? '✓ Geo' : '✗ Geo'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mock Photos */}
      {examType === 'mock' && photos?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Centre Photos</div>
          <div className="grid grid-cols-5 gap-2">
            {['centre','lab1','lab2','cctv','network'].map(type => {
              const p = photos.find(ph => ph.photo_type === type)
              return (
                <div key={type} onClick={() => p && setPhotoModal(p.photo_url)}
                  className={`aspect-square rounded-xl overflow-hidden border-2 ${p ? 'border-green-300 cursor-pointer hover:opacity-90' : 'border-dashed border-gray-200'} flex items-center justify-center`}>
                  {p ? <img src={p.photo_url} alt={type} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-300">{type}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Batch */}
      {examType === 'live' && batches?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Batch Attendance</div>
          <div className="space-y-2">
            {batches.map(b => (
              <div key={`${b.server_code}-${b.section_code}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="text-xs font-bold text-gray-500 w-16">{b.server_code}</div>
                <div className="flex-1"><span className="font-semibold">{b.section_code}</span></div>
                <div className="flex gap-3 text-center text-sm">
                  <div><div className="font-bold">{b.registered || '—'}</div><div className="text-xs text-gray-400">Reg</div></div>
                  <div><div className="font-bold text-green-600">{b.present || '—'}</div><div className="text-xs text-gray-400">Present</div></div>
                  <div><div className="font-bold text-red-500">{b.absent || '—'}</div><div className="text-xs text-gray-400">Absent</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues?.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Issues</div>
          {issues.map(i => (
            <div key={i.id} className="p-3 bg-red-50 border border-red-100 rounded-xl mb-2">
              <div className="flex items-center gap-2 mb-1">
                <SeverityBadge s={i.severity} />
                <span className="text-sm font-semibold capitalize">{i.issue_type}</span>
              </div>
              <div className="text-xs text-gray-600">{i.description}</div>
            </div>
          ))}
        </div>
      )}

      {photoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <img src={photoModal} alt="" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  )
}
