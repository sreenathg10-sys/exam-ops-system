// services/storageService.js
const SUPABASE_URL   = process.env.SUPABASE_URL
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'examops-media'

// Upload buffer directly to Supabase Storage
const uploadToSupabase = async (buffer, storagePath, mimetype = 'image/jpeg') => {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type':  mimetype,
        'x-upsert':      'true',
      },
      body: buffer,
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Storage upload failed: ${err.message || response.statusText}`)
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`
}

const deleteFromSupabase = async (storagePath) => {
  await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
    {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }
  )
}

module.exports = { uploadToSupabase, deleteFromSupabase }
