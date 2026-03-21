// controllers/mockController.js
const { query }            = require('../config/db');
const { uploadToSupabase } = require('../services/storageService');
const fs   = require('fs');
const path = require('path');

// POST submit mock checklist (Primary SM only)
const submitChecklist = async (req, res, next) => {
  try {
    const today  = new Date().toISOString().split('T')[0];
    const centre_id = req.user.centre_id;
    if (!centre_id) return res.status(400).json({ success: false, message: 'No centre assigned to user' });

    const {
      centre_name_verified, centre_address_verified,
      systems_available, systems_tested, buffer_systems, network_speed, system_remarks,
      cctv_available, cctv_working, ups_available, dg_available, partition_available,
      drinking_water, parking_available, centre_clean, restrooms_available,
      final_remarks,
    } = req.body;

    await query(
      `INSERT INTO mock_checklist (
        user_id, centre_id, exam_date,
        centre_name_verified, centre_address_verified,
        systems_available, systems_tested, buffer_systems, network_speed, system_remarks,
        cctv_available, cctv_working, ups_available, dg_available, partition_available,
        drinking_water, parking_available, centre_clean, restrooms_available,
        final_remarks, is_submitted, submitted_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,TRUE,NOW())
      ON CONFLICT (centre_id, exam_date) DO UPDATE SET
        centre_name_verified=$4, centre_address_verified=$5,
        systems_available=$6, systems_tested=$7, buffer_systems=$8, network_speed=$9, system_remarks=$10,
        cctv_available=$11, cctv_working=$12, ups_available=$13, dg_available=$14, partition_available=$15,
        drinking_water=$16, parking_available=$17, centre_clean=$18, restrooms_available=$19,
        final_remarks=$20, is_submitted=TRUE, submitted_at=NOW(), updated_at=NOW()`,
      [
        req.user.id, centre_id, today,
        centre_name_verified, centre_address_verified,
        systems_available, systems_tested, buffer_systems, network_speed, system_remarks,
        cctv_available, cctv_working, ups_available, dg_available, partition_available,
        drinking_water, parking_available, centre_clean, restrooms_available,
        final_remarks,
      ]
    );

    res.json({ success: true, message: 'Mock checklist submitted' });
  } catch (err) { next(err); }
};

// GET mock checklist for a centre
const getChecklist = async (req, res, next) => {
  try {
    const { centre_code } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT mc.* FROM mock_checklist mc
       JOIN centres c ON mc.centre_id = c.id
       WHERE c.centre_code = $1 AND mc.exam_date = $2`,
      [centre_code, date]
    );
    res.json({ success: true, checklist: result.rows[0] || null });
  } catch (err) { next(err); }
};

// POST upload mock photos (Primary SM only)
const uploadPhotos = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No photos uploaded' });
    }

    const today     = new Date().toISOString().split('T')[0];
    const centre_id = req.user.centre_id;
    const { photo_type } = req.body;

    if (!photo_type || !['centre','lab1','lab2','cctv','network'].includes(photo_type)) {
      return res.status(400).json({ success: false, message: 'Invalid photo_type. Must be: centre, lab1, lab2, cctv, network' });
    }

    const file        = req.files[0] || req.file;
    const storagePath = `mock-photos/${centre_id}_${today}_${photo_type}${path.extname(file.originalname)}`;
    const url         = await uploadToSupabase(file.path, storagePath);
    fs.unlinkSync(file.path);

    await query(
      `INSERT INTO mock_photos (centre_id, user_id, exam_date, photo_type, photo_url)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (centre_id, exam_date, photo_type) DO UPDATE SET photo_url=$5, uploaded_at=NOW()`,
      [centre_id, req.user.id, today, photo_type, url]
    );

    res.json({ success: true, message: `${photo_type} photo uploaded`, url });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
};

// GET mock photos for a centre
const getPhotos = async (req, res, next) => {
  try {
    const { centre_code } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT mp.photo_type, mp.photo_url, mp.uploaded_at
       FROM mock_photos mp
       JOIN centres c ON mp.centre_id = c.id
       WHERE c.centre_code = $1 AND mp.exam_date = $2
       ORDER BY mp.photo_type`,
      [centre_code, date]
    );
    res.json({ success: true, photos: result.rows });
  } catch (err) { next(err); }
};

module.exports = { submitChecklist, getChecklist, uploadPhotos, getPhotos };
