// src/pages/staff/MockChecklistTab.jsx
import { useState } from 'react'
import { mockAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { CheckCircle } from 'lucide-react'
import { Spinner, YesNo, PhotoSlot } from '../../components/common'

const PHOTO_SLOTS = [
  { key: 'centre',  label: 'Centre Photo' },
  { key: 'lab1',    label: 'Lab 1' },
  { key: 'lab2',    label: 'Lab 2' },
  { key: 'cctv',    label: 'CCTV' },
  { key: 'network', label: 'Network' },
]

export default function MockChecklistTab({ user }) {
  const [form, setForm] = useState({
    centre_name_verified: null, centre_address_verified: null,
    systems_available: '', systems_tested: '', buffer_systems: '', network_speed: '', system_remarks: '',
    cctv_available: null, cctv_working: null, ups_available: null, dg_available: null, partition_available: null,
    drinking_water: null, parking_available: null, centre_clean: null, restrooms_available: null,
    final_remarks: '',
  })
  const [photos,    setPhotos]    = useState({})
  const [uploading, setUploading] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handlePhoto = async (key, file) => {
    if (!file) return
    setUploading(u => ({ ...u, [key]: true }))
    try {
      const res = await mockAPI.uploadPhoto(key, file)
      setPhotos(p => ({ ...p, [key]: res.data.url }))
      toast.success(`${key} photo uploaded`)
    } catch (e) {
      toast.error(`Failed to upload ${key} photo`)
    } finally {
      setUploading(u => ({ ...u, [key]: false }))
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await mockAPI.submitChecklist(form)
      toast.success('Mock checklist submitted!')
      setSubmitted(true)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return (
    <div className="card p-8 text-center">
      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
      <div className="text-lg font-bold text-gray-800">Mock Checklist Submitted</div>
      <div className="text-sm text-gray-500 mt-1">All data has been recorded successfully</div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Centre Verification */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Centre Verification</div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Centre name verified</span>
          <YesNo val={form.centre_name_verified} onChange={v => set('centre_name_verified', v)} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Centre address verified</span>
          <YesNo val={form.centre_address_verified} onChange={v => set('centre_address_verified', v)} />
        </div>
      </div>

      {/* Systems */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Systems</div>
        <div className="grid grid-cols-2 gap-3">
          {[['systems_available','Systems available'],['systems_tested','Systems tested'],['buffer_systems','Buffer systems'],['network_speed','Network speed']].map(([k,l]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input className="input" type={k === 'network_speed' ? 'text' : 'number'} min="0" value={form[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
        </div>
        <div>
          <label className="label">System remarks</label>
          <input className="input" value={form.system_remarks} onChange={e => set('system_remarks', e.target.value)} placeholder="Optional…" />
        </div>
      </div>

      {/* Infrastructure */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Infrastructure</div>
        {[['cctv_available','CCTV available'],['cctv_working','CCTV working'],['ups_available','UPS'],['dg_available','DG (Generator)'],['partition_available','Partition available']].map(([k,l]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{l}</span>
            <YesNo val={form[k]} onChange={v => set(k, v)} />
          </div>
        ))}
      </div>

      {/* Facilities */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Facilities</div>
        {[['drinking_water','Drinking water available'],['parking_available','Parking available'],['centre_clean','Centre & corridors clean'],['restrooms_available','Separate male/female restrooms']].map(([k,l]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{l}</span>
            <YesNo val={form[k]} onChange={v => set(k, v)} />
          </div>
        ))}
      </div>

      {/* Photo Uploads */}
      <div className="card p-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Photo Uploads</div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {PHOTO_SLOTS.map(({ key, label }) => (
            <PhotoSlot
              key={key}
              label={label}
              preview={photos[key]}
              loading={uploading[key]}
              onUpload={f => handlePhoto(key, f)}
            />
          ))}
        </div>
      </div>

      {/* Final Remarks */}
      <div className="card p-4">
        <label className="label">Final Remarks</label>
        <textarea className="input h-24 resize-none" placeholder="Any final observations…" value={form.final_remarks} onChange={e => set('final_remarks', e.target.value)} />
      </div>

      <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full py-3">
        {submitting ? <Spinner size="sm" /> : 'Submit Mock Day Report'}
      </button>
    </div>
  )
}
