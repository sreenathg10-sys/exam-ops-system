// src/pages/master/MasterDashboard.jsx
import { useState, useEffect } from 'react'
import { dashboardAPI, issuesAPI, configAPI, reportsAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { RefreshCw, Download, Upload, BarChart2, AlertTriangle, Map, FileSpreadsheet, ChevronRight } from 'lucide-react'
import { Spinner, EmptyState, SeverityBadge, TrafficLight } from '../../components/common'
import { fmtDate, fmtTime, fmtDateTime, today, downloadBlob } from '../../utils/helpers'
import Layout from '../../components/layout/Layout'
import ZoneDrillDown from './ZoneDrillDown'

const TABS = [
  { id: 'overview', label: 'Zone Overview', icon: Map },
  { id: 'issues',   label: 'Issues Feed',   icon: AlertTriangle },
  { id: 'reports',  label: 'Reports',        icon: BarChart2 },
  { id: 'config',   label: 'Config',         icon: FileSpreadsheet },
]

export default function MasterDashboard() {
  const [date,      setDate]      = useState(today())
  const [examType,  setExamType]  = useState('live')
  const [activeTab, setActiveTab] = useState('overview')
  const [data,      setData]      = useState(null)
  const [issues,    setIssues]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [selectedZone, setSelectedZone] = useState(null)

  useEffect(() => { loadData() }, [date, examType])
  useEffect(() => { if (activeTab === 'issues') loadIssues() }, [activeTab, date])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await dashboardAPI.master({ date, exam_type: examType })
      setData(res.data)
    } catch (e) {
      toast.error('Failed to load dashboard')
    } finally { setLoading(false) }
  }

  const loadIssues = async () => {
    try {
      const res = await issuesAPI.all({ date, status: 'open' })
      setIssues(res.data.issues || [])
    } catch (e) {}
  }

  const downloadReport = async (type) => {
    try {
      const fn  = type === 'zone' ? reportsAPI.zoneSummary : reportsAPI.centreDetail
      const res = await fn({ date, exam_type: examType })
      const filename = type === 'zone' ? `zone_summary_${date}.xlsx` : `centre_detail_${date}.xlsx`
      downloadBlob(res.data, filename)
      toast.success('Report downloaded!')
    } catch (e) {
      toast.error('Failed to download report')
    }
  }

  if (selectedZone) return (
    <Layout>
      <ZoneDrillDown zone={selectedZone} date={date} examType={examType} onBack={() => setSelectedZone(null)} />
    </Layout>
  )

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Master Admin</div>
            <h1 className="text-xl font-bold text-gray-900">Pan India Overview</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input w-auto text-sm" />
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {['mock','live'].map(t => (
                <button key={t} onClick={() => setExamType(t)}
                  className={`px-4 py-2 text-xs font-bold capitalize transition-all ${examType === t ? (t === 'live' ? 'bg-red-600 text-white' : 'bg-blue-700 text-white') : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {t === 'mock' ? '📋' : '⚡'} {t}
                </button>
              ))}
            </div>
            <button onClick={loadData} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Big Numbers */}
        {data?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total Centres',    val: data.stats.total_centres,    bg: 'bg-gray-50',    text: 'text-gray-800' },
              { label: 'Reporting',         val: data.stats.reporting_centres, bg: 'bg-green-50',  text: 'text-green-700' },
              { label: 'Not Started',       val: data.stats.not_started,       bg: 'bg-red-50',    text: 'text-red-700' },
              { label: 'Candidates Present',val: data.stats.total_present,     bg: 'bg-blue-50',   text: 'text-blue-700' },
              { label: 'Open Issues',       val: data.stats.open_issues,       bg: 'bg-amber-50',  text: 'text-amber-700' },
            ].map(({ label, val, bg, text }) => (
              <div key={label} className={`${bg} rounded-xl p-4 text-center border border-gray-100`}>
                <div className={`text-2xl sm:text-3xl font-black ${text}`}>{val ?? '—'}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all ${activeTab === id ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Zone Overview Tab */}
        {activeTab === 'overview' && (
          loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
            <div className="space-y-3">
              {data?.zones?.map(z => {
                const pct = parseInt(z.total_centres) > 0 ? Math.round((parseInt(z.reporting_centres) / parseInt(z.total_centres)) * 100) : 0
                return (
                  <div key={z.zone_code}
                    onClick={() => setSelectedZone(z)}
                    className={`card p-4 border-l-4 cursor-pointer hover:shadow-md transition-all ${pct === 100 ? 'border-l-green-500' : pct > 0 ? 'border-l-amber-400' : 'border-l-red-500'}`}>
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div>
                        <div className="font-semibold text-gray-900">{z.zone_name}</div>
                        <div className="text-xs text-gray-400">{z.state} · {z.total_centres} centres</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrafficLight pct={pct} />
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-gray-700">{z.reporting_centres}/{z.total_centres}</div>
                        <div className="text-xs text-gray-400">Centres</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-blue-700">{z.b1_present || '—'}</div>
                        <div className="text-xs text-gray-400">B1</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-blue-700">{z.b2_present || '—'}</div>
                        <div className="text-xs text-gray-400">B2</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-blue-700">{z.b3_present || '—'}</div>
                        <div className="text-xs text-gray-400">B3</div>
                      </div>
                      <div className={`rounded-lg p-2 ${parseInt(z.open_issues) > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <div className={`text-sm font-bold ${parseInt(z.open_issues) > 0 ? 'text-red-600' : 'text-gray-500'}`}>{z.open_issues}</div>
                        <div className="text-xs text-gray-400">Issues</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* Issues Feed Tab */}
        {activeTab === 'issues' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">{issues.length} open issues · {fmtDate(date)}</div>
              <button onClick={loadIssues} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><RefreshCw className="h-4 w-4" /></button>
            </div>
            {issues.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No open issues" desc="All clear for this date" />
            ) : issues.map(issue => (
              <div key={issue.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <SeverityBadge s={issue.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 capitalize text-sm">{issue.issue_type?.replace('_',' ')} — {issue.centre_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{issue.zone_name} · {issue.city} {issue.section_code ? `· ${issue.section_code}` : ''}</div>
                    <div className="text-sm text-gray-600 mt-2">{issue.description}</div>
                    <div className="text-xs text-gray-400 mt-1">{issue.full_name} · {fmtTime(issue.created_at)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500 mb-2">Download Excel reports for <strong>{fmtDate(date)}</strong> · <span className="capitalize">{examType}</span></div>
            {[
              { type: 'zone',   label: 'Zone Wise Attendance Summary',   desc: 'All zones · Staff + candidate attendance · Excel' },
              { type: 'centre', label: 'Centre Wise Detailed Report',    desc: 'All centres · Checklist + batch data + issues · Excel' },
            ].map(({ type, label, desc }) => (
              <div key={type} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-800 text-sm">{label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                </div>
                <button onClick={() => downloadReport(type)} className="btn-success flex items-center gap-2 text-sm whitespace-nowrap flex-shrink-0">
                  <Download className="h-4 w-4" /> Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && <ConfigTab />}
      </div>
    </Layout>
  )
}

function ConfigTab() {
  const [file,        setFile]        = useState(null)
  const [uploading,   setUploading]   = useState(false)
  const [result,      setResult]      = useState(null)
  const [status,      setStatus]      = useState(null)
  const [log,         setLog]         = useState([])
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => { loadStatus() }, [])

  const loadStatus = async () => {
    try {
      const [s, l] = await Promise.all([configAPI.status(), configAPI.importLog()])
      setStatus(s.data.data)
      setLog(l.data.data || [])
    } catch (e) {} finally { setLoadingStatus(false) }
  }

  const downloadTemplate = async () => {
    try {
      const res = await configAPI.template()
      downloadBlob(res.data, 'ExamOps_Config_Template.xlsx')
      toast.success('Template downloaded!')
    } catch (e) { toast.error('Failed to download template') }
  }

  const handleUpload = async () => {
    if (!file) return toast.error('Select an Excel file first')
    setUploading(true)
    setResult(null)
    try {
      const res = await configAPI.import(file)
      setResult({ success: true, data: res.data })
      toast.success('Import successful!')
      loadStatus()
    } catch (e) {
      setResult({ success: false, data: e.response?.data })
      toast.error('Import failed. Check errors below.')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-5">
      {/* DB Status */}
      {!loadingStatus && status && (
        <div className="card p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Current Database</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(status).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-gray-800">{v}</div>
                <div className="text-xs text-gray-400 capitalize">{k}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Download */}
      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-800 text-sm">Download Excel Template</div>
          <div className="text-xs text-gray-400 mt-0.5">5 sheets · Zones, Centres, Servers, Schedule, Users</div>
        </div>
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 text-sm flex-shrink-0">
          <Download className="h-4 w-4" /> Template
        </button>
      </div>

      {/* Upload */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Upload Config Excel</div>
        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { setFile(e.target.files[0]); setResult(null) }} />
          <Upload className={`h-8 w-8 mb-2 ${file ? 'text-green-500' : 'text-gray-300'}`} />
          <span className="text-sm font-semibold text-gray-700">{file ? file.name : 'Click to select Excel file'}</span>
          <span className="text-xs text-gray-400 mt-1">.xlsx or .xls · Max 10MB</span>
        </label>
        <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary w-full flex items-center justify-center gap-2">
          {uploading ? <><Spinner size="sm" /> Importing…</> : '⬆️ Upload & Import'}
        </button>

        {/* Result */}
        {result && (
          <div className={`rounded-xl p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className={`font-bold text-sm mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ Import completed successfully' : '❌ Validation failed'}
            </div>
            {result.success && result.data.summary && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                {Object.entries(result.data.summary).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-lg p-2 text-center">
                    <div className="font-bold text-gray-800">{JSON.stringify(v)}</div>
                    <div className="text-gray-400 capitalize">{k}</div>
                  </div>
                ))}
              </div>
            )}
            {!result.success && result.data?.errors && (
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {Object.entries(result.data.errors).map(([sheet, errs]) => (
                  <div key={sheet}>
                    <div className="text-xs font-bold text-red-700 mb-1">Sheet: {sheet}</div>
                    {errs.map((e, i) => <div key={i} className="text-xs text-red-600 pl-2">• {e}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Log */}
      {log.length > 0 && (
        <div className="card p-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Import History</div>
          <div className="space-y-2">
            {log.slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="text-sm text-gray-700">{l.filename}</div>
                  <div className="text-xs text-gray-400">{fmtDateTime(l.imported_at)} · by {l.imported_by_username}</div>
                </div>
                <span className={l.status === 'success' ? 'badge-green' : 'badge-red'}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
