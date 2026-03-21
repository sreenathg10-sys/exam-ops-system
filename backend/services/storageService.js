// services/storageService.js
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_KEY;
const STORAGE_BUCKET  = process.env.STORAGE_BUCKET || 'examops-media';

const uploadToSupabase = async (filePath, storagePath) => {
  const fileBuffer  = fs.readFileSync(filePath);
  const ext         = path.extname(filePath).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: fileBuffer,
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Storage upload failed: ${err.message || response.statusText}`);
  }

  // Return public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
};

const deleteFromSupabase = async (storagePath) => {
  await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }
  );
};

module.exports = { uploadToSupabase, deleteFromSupabase };
