// controllers/attendanceController.js
const { query, getClient } = require('../config/db');
const { uploadToSupabase }  = require('../services/storageService');
const fs = require('fs');

// GET today's attendance status for logged in user
const getMyAttendance = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      'SELECT * FROM staff_attendance WHERE user_id = $1 AND exam_date = $2',
      [req.user.id, today]
    );
    res.json({ success: true, attendance: result.rows[0] || null });
  } catch (err) { next(err); }
};

// POST mark reported to centre
const markReported = async (req, res, next) => {
  try {
    const today    = new Date().toISOString().split('T')[0];
    const { geo_lat, geo_lng, exam_type } = req.body;

    const existing = await query(
      'SELECT id FROM staff_attendance WHERE user_id = $1 AND exam_date = $2',
      [req.user.id, today]
    );

    if (existing.rows[0]) {
      await query(
        `UPDATE staff_attendance SET reported_at = NOW(), reported_geo_lat = $1, reported_geo_lng = $2, updated_at = NOW()
         WHERE user_id = $3 AND exam_date = $4`,
        [geo_lat || null, geo_lng || null, req.user.id, today]
      );
    } else {
      await query(
        `INSERT INTO staff_attendance (user_id, exam_date, exam_type, reported_at, reported_geo_lat, reported_geo_lng)
         VALUES ($1, $2, $3, NOW(), $4, $5)`,
        [req.user.id, today, exam_type || 'live', geo_lat || null, geo_lng || null]
      );
    }

    res.json({ success: true, message: 'Reported to centre confirmed', reported_at: new Date() });
  } catch (err) { next(err); }
};

// POST upload selfie
const uploadSelfie = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No selfie uploaded' });
    const today = new Date().toISOString().split('T')[0];
    const storagePath = `selfies/${req.user.id}_${today}_selfie${require('path').extname(req.file.originalname)}`;
    const url = await uploadToSupabase(req.file.path, storagePath);
    fs.unlinkSync(req.file.path);

    await query(
      `INSERT INTO staff_attendance (user_id, exam_date, selfie_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, exam_date) DO UPDATE SET selfie_url = $3, updated_at = NOW()`,
      [req.user.id, today, url]
    );

    res.json({ success: true, message: 'Selfie uploaded', selfie_url: url });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
};

// POST save geo tag
const saveGeoTag = async (req, res, next) => {
  try {
    const { geo_lat, geo_lng } = req.body;
    if (!geo_lat || !geo_lng) return res.status(400).json({ success: false, message: 'geo_lat and geo_lng are required' });
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO staff_attendance (user_id, exam_date, geo_lat, geo_lng, geo_captured_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, exam_date) DO UPDATE SET geo_lat = $3, geo_lng = $4, geo_captured_at = NOW(), updated_at = NOW()`,
      [req.user.id, today, geo_lat, geo_lng]
    );

    res.json({ success: true, message: 'Geo tag saved' });
  } catch (err) { next(err); }
};

// POST submit attendance (mark as complete)
const submitAttendance = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await query(
      `UPDATE staff_attendance SET is_submitted = TRUE, submitted_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND exam_date = $2
       RETURNING *`,
      [req.user.id, today]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'No attendance record found for today' });
    res.json({ success: true, message: 'Attendance submitted', attendance: result.rows[0] });
  } catch (err) { next(err); }
};

// GET centre attendance status (for dashboard)
const getCentreAttendance = async (req, res, next) => {
  try {
    const { centre_code } = req.params;
    const { date } = req.query;
    const examDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT u.id, u.username, u.full_name, u.role,
              s.server_code, s.is_primary,
              sa.reported_at, sa.selfie_url, sa.geo_lat, sa.geo_lng,
              sa.is_submitted, sa.submitted_at
       FROM users u
       LEFT JOIN servers  s  ON u.server_id  = s.id
       LEFT JOIN centres  c  ON u.centre_id  = c.id
       LEFT JOIN staff_attendance sa ON sa.user_id = u.id AND sa.exam_date = $2
       WHERE c.centre_code = $1 AND u.is_active = TRUE
         AND u.role IN ('server_manager','event_manager','biometric_staff')
       ORDER BY u.role, u.username`,
      [centre_code, examDate]
    );

    res.json({ success: true, date: examDate, staff: result.rows });
  } catch (err) { next(err); }
};

module.exports = { getMyAttendance, markReported, uploadSelfie, saveGeoTag, submitAttendance, getCentreAttendance };
