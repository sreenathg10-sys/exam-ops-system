// src/components/common/index.jsx
import { Loader2, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

export const Spinner = ({ size = 'md' }) => {
  const sz = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size]
  return <Loader2 className={`${sz} animate-spin text-blue-600`} />
}

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spinner size="lg" />
  </div>
)

export const EmptyState = ({ icon: Icon, title, desc }) => (
  <div className="text-center py-12 text-gray-400">
    {Icon && <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />}
    <p className="font-semibold text-gray-600">{title}</p>
    {desc && <p className="text-sm mt-1">{desc}</p>}
  </div>
)

export const StatusDot = ({ ok }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
)

export const TrafficLight = ({ pct }) => {
  if (pct === 100) return <span className="badge-green">✓ All done</span>
  if (pct > 0)     return <span className="badge-amber">⚠ Partial</span>
  return                  <span className="badge-red">✗ Not started</span>
}

export const SeverityBadge = ({ s }) => {
  const map = {
    critical: 'bg-red-700 text-white',
    high:     'bg-red-100 text-red-800',
    medium:   'bg-amber-100 text-amber-800',
    low:      'bg-blue-100 text-blue-800',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${map[s] || 'bg-gray-100 text-gray-700'}`}>{s}</span>
}

export const YesNo = ({ val, onChange, name }) => (
  <div className="flex gap-2">
    {['Yes','No'].map(opt => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt === 'Yes')}
        className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
          (opt === 'Yes' && val === true) || (opt === 'No' && val === false)
            ? opt === 'Yes' ? 'bg-green-600 text-white border-green-600' : 'bg-red-500 text-white border-red-500'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`}
      >{opt}</button>
    ))}
  </div>
)

export const PhotoSlot = ({ label, onUpload, preview, loading }) => (
  <label className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-3 cursor-pointer transition-all
    ${preview ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
    <input type="file" accept="image/*" className="hidden" onChange={e => onUpload(e.target.files[0])} disabled={loading} />
    {loading ? (
      <Spinner size="sm" />
    ) : preview ? (
      <>
        <img src={preview} alt={label} className="h-16 w-full object-cover rounded-lg mb-1" />
        <CheckCircle className="h-4 w-4 text-green-600 absolute top-1 right-1" />
      </>
    ) : (
      <>
        <span className="text-2xl text-gray-300 mb-1">+</span>
      </>
    )}
    <span className="text-xs text-gray-500 text-center mt-1">{label}</span>
  </label>
)
