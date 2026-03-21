// controllers/liveController.js
const { query } = require('../config/db');

// POST submit live checklist (Primary SM only)
const submitChecklist = async (req, res, next) => {
  try {
    const today     = new Date().toISOString().split('T')[0];
    const centre_id = req.user.centre_id;
    if (!centre_id) return res.status(400).json({ success: false, message: 'No centre assigned' });

    const { security_reached, security_male_count, security_female_count, hhmd_available, remarks } = req.body;

    await query(
      `INSERT INTO live_checklist (user_id, centre_id, exam_date, security_reached, security_male_count, security_female_count, hhmd_available, remarks, is_submitted, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW())
       ON CONFLICT (centre_id, exam_date) DO UPDATE SET
         security_reached=$4, security_male_count=$5, security_female_count=$6,
         hhmd_available=$7, remarks=$8, is_submitted=TRUE, submitted_at=NOW(), updated_at=NOW()`,
      [req.user.id, centre_id, today, security_reached, security_male_count || 0, security_female_count || 0, hhmd_available, remarks]
    );

    res.json({ success: true, message: 'Live checklist submitted' });
  } catch (err) { next(err); }
};

// GET live checklist
const getChecklist = async (req, res, next) => {
  try {
    const { centre_code } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const result = await query(
      `SELECT lc.* FROM live_checklist lc
       JOIN centres c ON lc.centre_id = c.id
       WHERE c.centre_code = $1 AND lc.exam_date = $2`,
      [centre_code, date]
    );
    res.json({ success: true, checklist: result.rows[0] || null });
  } catch (err) { next(err); }
};

// POST submit batch attendance (B1 / B2 / B3)
const submitBatch = async (req, res, next) => {
  try {
    const today     = new Date().toISOString().split('T')[0];
    const server_id = req.user.server_id;
    const centre_id = req.user.centre_id;
    if (!server_id) return res.status(400).json({ success: false, message: 'No server assigned' });

    const { section_code, registered, present } = req.body;
    if (!section_code || !['B1','B2','B3'].includes(section_code.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'section_code must be B1, B2 or B3' });
    }
    if (registered === undefined || present === undefined) {
      return res.status(400).json({ success: false, message: 'registered and present are required' });
    }
    if (parseInt(present) > parseInt(registered)) {
      return res.status(400).json({ success: false, message: 'Present cannot exceed registered count' });
    }

    await query(
      `INSERT INTO batch_attendance (server_id, centre_id, user_id, exam_date, section_code, registered, present, is_submitted, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,NOW())
       ON CONFLICT (server_id, exam_date, section_code) DO UPDATE SET
         registered=$6, present=$7, is_submitted=TRUE, submitted_at=NOW(), updated_at=NOW()`,
      [server_id, centre_id, req.user.id, today, section_code.toUpperCase(), parseInt(registered), parseInt(present)]
    );

    res.json({ success: true, message: `Batch ${section_code} attendance submitted` });
  } catch (err) { next(err); }
};

// GET batch attendance for a server/centre
const getBatchAttendance = async (req, res, next) => {
  try {
    const { centre_code } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT ba.section_code, ba.registered, ba.present, ba.absent,
              ba.is_submitted, ba.submitted_at,
              s.server_code, s.is_primary
       FROM batch_attendance ba
       JOIN servers  s ON ba.server_id  = s.id
       JOIN centres  c ON ba.centre_id  = c.id
       WHERE c.centre_code = $1 AND ba.exam_date = $2
       ORDER BY s.server_code, ba.section_code`,
      [centre_code, date]
    );

    res.json({ success: true, date, batches: result.rows });
  } catch (err) { next(err); }
};

module.exports = { submitChecklist, getChecklist, submitBatch, getBatchAttendance };
