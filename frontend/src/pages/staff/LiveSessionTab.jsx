// src/pages/staff/LiveSessionTab.jsx
import { useState, useEffect } from 'react'
import { liveAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { CheckCircle } from 'lucide-react'
import { Spinner } from '../../components/common'
import { fmtDateTime } from '../../utils/helpers'

const BATCHES = [
  { code: 'B1', label: 'B1 — Morning',   time: '09:00 – 11:30' },
  { code: 'B2', label: 'B2 — Afternoon', time: '12:30 – 15:00' },
  { code: 'B3', label: 'B3 — Evening',   time: '16:00 – 18:30' },
]

export default function LiveSessionTab({ user }) {
  const [batches,   setBatches]   = useState({})
  const [inputs,    setInputs]    = useState({ B1: { registered: '', present: '' }, B2: { registered: '', present: '' }, B3: { registered: '', present: '' } })
  const [submitting, setSubmitting] = useState({})
  const [loading,    setLoading]    = useState(true)

  useEffect(() => { loadBatches() }, [])

  const loadBatches = async () => {
    try {
      const res = await liveAPI.getBatch(user.centre_code)
      const map = {}
      res.data.batches?.forEach(b => { if (b.server_code === user.server_code) map[b.section_code] = b })
      setBatches(map)
    } catch (e) {} finally { setLoading(false) }
  }

  const handleSubmit = async (code) => {
    const inp = inputs[code]
    if (!inp.registered || !inp.present) return toast.error('Enter registered and present counts')
    if (parseInt(inp.present) > parseInt(inp.registered)) return toast.error('Present cannot exceed registered')
    setSubmitting(s => ({ ...s, [code]: true }))
    try {
      await liveAPI.submitBatch({ section_code: code, registered: inp.registered, present: inp.present })
      toast.success(`Batch ${code} submitted!`)
      loadBatches()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Submit failed')
    } finally { setSubmitting(s => ({ ...s, [code]: false })) }
  }

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <div className="space-y-3">
      {BATCHES.map(({ code, label, time }) => {
        const submitted = batches[code]
        const inp = inputs[code]
        const absent = inp.registered && inp.present ? Math.max(0, parseInt(inp.registered) - parseInt(inp.present)) : null

        return (
          <div key={code} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-semibold text-gray-800 text-sm">{label}</div>
                <div className="text-xs text-gray-400">{time}</div>
              </div>
              {submitted
                ? <span className="badge-green">Submitted</span>
                : <span className="badge-amber">Pending</span>
              }
            </div>

            {submitted ? (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-gray-800">{submitted.registered}</div>
                  <div className="text-xs text-gray-400">Registered</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-green-700">{submitted.present}</div>
                  <div className="text-xs text-gray-400">Present</div>
                </div>
                <div className="bg-red-50 rounded-lg p-2">
                  <div className="text-lg font-bold text-red-600">{submitted.absent}</div>
                  <div className="text-xs text-gray-400">Absent</div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="label">Registered</label>
                    <input className="input text-center" type="number" min="0" value={inp.registered}
                      onChange={e => setInputs(i => ({ ...i, [code]: { ...i[code], registered: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="label">Present</label>
                    <input className="input text-center" type="number" min="0" value={inp.present}
                      onChange={e => setInputs(i => ({ ...i, [code]: { ...i[code], present: e.target.value } }))} />
                  </div>
                  <div>
                    <label className="label">Absent (auto)</label>
                    <div className="input text-center bg-gray-50 text-gray-500 flex items-center justify-center">
                      {absent !== null ? absent : '—'}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleSubmit(code)} disabled={submitting[code]} className="btn-danger w-full text-sm py-2">
                  {submitting[code] ? <Spinner size="sm" /> : `Submit ${code}`}
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
