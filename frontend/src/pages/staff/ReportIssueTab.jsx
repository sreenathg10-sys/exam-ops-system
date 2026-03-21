// src/pages/staff/ReportIssueTab.jsx
import { useState } from 'react'
import { issuesAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { CheckCircle, Plus, X } from 'lucide-react'
import { Spinner } from '../../components/common'

const ISSUE_TYPES = ['power','network','system','biometric','candidate','other']
const SEVERITIES  = ['low','medium','high','critical']
const SESSIONS    = ['All / Unknown','B1','B2','B3']

export default function ReportIssueTab({ user, examType }) {
  const [form, setForm] = useState({
    issue_type: '', severity: '', section_code: '', app_roll_no: '', description: '', exam_type: examType || 'live'
  })
  const [photos,    setPhotos]    = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addPhoto = (e) => {
    const files = Array.from(e.target.files)
    setPhotos(p => [...p, ...files].slice(0, 5))
  }

  const removePhoto = (i) => setPhotos(p => p.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    if (!form.issue_type) return toast.error('Select issue type')
    if (!form.severity)   return toast.error('Select severity')
    if (!form.description) return toast.error('Enter description')
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      photos.forEach(f => fd.append('photos', f))
      await issuesAPI.report(fd)
      toast.success('Issue reported successfully!')
      setSubmitted(true)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to report issue')
    } finally { setSubmitting(false) }
  }

  const reset = () => {
    setForm({ issue_type: '', severity: '', section_code: '', app_roll_no: '', description: '', exam_type: examType || 'live' })
    setPhotos([])
    setSubmitted(false)
  }

  if (submitted) return (
    <div className="card p-8 text-center">
      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
      <div className="text-lg font-bold text-gray-800">Issue Reported</div>
      <div className="text-sm text-gray-500 mt-1 mb-4">The issue has been logged and escalated</div>
      <button onClick={reset} className="btn-secondary">Report Another Issue</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-4">
        {/* Issue Type */}
        <div>
          <label className="label">Issue Type *</label>
          <div className="grid grid-cols-3 gap-2">
            {ISSUE_TYPES.map(t => (
              <button key={t} type="button" onClick={() => set('issue_type', t)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border capitalize transition-all ${
                  form.issue_type === t ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="label">Severity *</label>
          <div className="flex gap-2">
            {SEVERITIES.map(s => {
              const col = { low: 'bg-blue-600', medium: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-red-600' }[s]
              return (
                <button key={s} type="button" onClick={() => set('severity', s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize border transition-all ${
                    form.severity === s ? `${col} text-white border-transparent` : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}>{s}</button>
              )
            })}
          </div>
        </div>

        {/* Session */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Session</label>
            <select className="input" value={form.section_code} onChange={e => set('section_code', e.target.value)}>
              {SESSIONS.map(s => <option key={s} value={s === 'All / Unknown' ? '' : s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">App / Roll No</label>
            <input className="input" placeholder="Optional" value={form.app_roll_no} onChange={e => set('app_roll_no', e.target.value)} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description *</label>
          <textarea className="input h-24 resize-none" placeholder="Full description of the issue…" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        {/* Evidence Photos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Evidence Photos ({photos.length}/5)</label>
            {photos.length < 5 && (
              <label className="cursor-pointer text-xs text-blue-600 font-semibold hover:text-blue-800">
                <input type="file" accept="image/*" multiple className="hidden" onChange={addPhoto} />
                + Add photo
              </label>
            )}
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((f, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={URL.createObjectURL(f)} className="w-16 h-16 object-cover rounded-lg border" alt="" />
                  <button onClick={() => removePhoto(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="btn-danger w-full py-3 flex items-center justify-center gap-2">
        {submitting ? <Spinner size="sm" /> : '🚨 Submit Issue Report'}
      </button>
    </div>
  )
}
