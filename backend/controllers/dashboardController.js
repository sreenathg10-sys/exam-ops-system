// controllers/dashboardController.js
const { query } = require('../config/db');

// GET zone admin dashboard
const getZoneDashboard = async (req, res, next) => {
  try {
    const date      = req.query.date || new Date().toISOString().split('T')[0];
    const exam_type = req.query.exam_type || 'live';
    const zone_id = req.query.zone_id_override || req.user.zone_id;
    if (!zone_id) return res.status(403).json({ success: false, message: 'No zone assigned' });

    const centres = await query(
      `SELECT c.id, c.centre_code, c.centre_name, c.city, c.total_capacity,
              -- Primary SM info
              (SELECT u.full_name FROM users u JOIN servers s ON u.server_id = s.id
               WHERE s.centre_id = c.id AND s.is_primary = TRUE AND u.role = 'server_manager' LIMIT 1) AS primary_sm,
              -- Staff counts
              (SELECT COUNT(*) FROM users u2 WHERE u2.centre_id = c.id AND u2.role IN ('server_manager','event_manager','biometric_staff') AND u2.is_active=TRUE) AS total_staff,
              (SELECT COUNT(*) FROM users u3 
               JOIN staff_attendance sa ON sa.user_id = u3.id AND sa.exam_date = $2
               WHERE u3.centre_id = c.id AND u3.role IN ('server_manager','event_manager','biometric_staff')) AS staff_reported,
              -- Checklist
              CASE WHEN $3 = 'mock' THEN
                (SELECT is_submitted FROM mock_checklist mc WHERE mc.centre_id = c.id AND mc.exam_date = $2 LIMIT 1)
              ELSE
                (SELECT is_submitted FROM live_checklist lc WHERE lc.centre_id = c.id AND lc.exam_date = $2 LIMIT 1)
              END AS checklist_submitted,
              -- Photos (mock only)
              (SELECT COUNT(*) FROM mock_photos mp WHERE mp.centre_id = c.id AND mp.exam_date = $2) AS photos_uploaded,
              -- Issues
              (SELECT COUNT(*) FROM issues i WHERE i.centre_id = c.id AND i.exam_date = $2 AND i.status = 'open') AS open_issues,
              -- Server count
              (SELECT COUNT(*) FROM servers s2 WHERE s2.centre_id = c.id AND s2.is_active = TRUE) AS server_count
       FROM centres c
       WHERE c.zone_id = $1 AND c.is_active = TRUE
       ORDER BY c.centre_code`,
      [zone_id, date, exam_type]
    );

    // Summary counts
    const total    = centres.rows.length;
    const allDone  = centres.rows.filter(c => parseInt(c.staff_reported) === parseInt(c.total_staff) && c.checklist_submitted).length;
    const partial  = centres.rows.filter(c => parseInt(c.staff_reported) > 0 && (parseInt(c.staff_reported) < parseInt(c.total_staff) || !c.checklist_submitted)).length;
    const notStart = centres.rows.filter(c => parseInt(c.staff_reported) === 0).length;

    res.json({
      success: true,
      date,
      exam_type,
      summary: { total, all_done: allDone, partial, not_started: notStart },
      centres: centres.rows,
    });
  } catch (err) { next(err); }
};

// GET master admin dashboard
const getMasterDashboard = async (req, res, next) => {
  try {
    const date      = req.query.date || new Date().toISOString().split('T')[0];
    const exam_type = req.query.exam_type || 'live';

    // Pan India numbers
    const totals = await query(
      `SELECT
        (SELECT COUNT(*) FROM centres WHERE is_active=TRUE) AS total_centres,
        (SELECT COUNT(DISTINCT c.id) FROM centres c
         JOIN users u ON u.centre_id = c.id
         JOIN staff_attendance sa ON sa.user_id = u.id AND sa.exam_date = $1) AS reporting_centres,
        (SELECT COALESCE(SUM(present),0) FROM batch_attendance WHERE exam_date = $1) AS total_present,
        (SELECT COUNT(*) FROM issues WHERE exam_date = $1 AND status = 'open') AS open_issues`,
      [date]
    );

    const stats = totals.rows[0];
    stats.not_started = parseInt(stats.total_centres) - parseInt(stats.reporting_centres);

    // Zone wise summary
    const zones = await query(
      `SELECT z.id, z.zone_code, z.zone_name, z.state,
              COUNT(DISTINCT c.id) AS total_centres,
              COUNT(DISTINCT CASE WHEN sa.exam_date = $1 THEN u.centre_id END) AS reporting_centres,
              COALESCE(SUM(CASE WHEN ba.exam_date = $1 AND ba.section_code='B1' THEN ba.present ELSE 0 END),0) AS b1_present,
              COALESCE(SUM(CASE WHEN ba.exam_date = $1 AND ba.section_code='B2' THEN ba.present ELSE 0 END),0) AS b2_present,
              COALESCE(SUM(CASE WHEN ba.exam_date = $1 AND ba.section_code='B3' THEN ba.present ELSE 0 END),0) AS b3_present,
              COUNT(DISTINCT CASE WHEN i.exam_date = $1 AND i.status='open' THEN i.id END) AS open_issues
       FROM zones z
       LEFT JOIN centres c ON c.zone_id = z.id AND c.is_active = TRUE
       LEFT JOIN users u ON u.centre_id = c.id AND u.role IN ('server_manager','event_manager','biometric_staff')
       LEFT JOIN staff_attendance sa ON sa.user_id = u.id
       LEFT JOIN batch_attendance ba ON ba.centre_id = c.id
       LEFT JOIN issues i ON i.centre_id = c.id
       WHERE z.is_active = TRUE
       GROUP BY z.id, z.zone_code, z.zone_name, z.state
       ORDER BY z.zone_name`,
      [date]
    );

    res.json({
      success: true,
      date,
      exam_type,
      stats,
      zones: zones.rows,
    });
  } catch (err) { next(err); }
};

// GET centre drill down detail
const getCentreDetail = async (req, res, next) => {
  try {
    const { centre_code } = req.params;
    const date      = req.query.date || new Date().toISOString().split('T')[0];
    const exam_type = req.query.exam_type || 'live';

    // Centre info
    const centreRes = await query(
      'SELECT c.*, z.zone_name, z.zone_code FROM centres c JOIN zones z ON c.zone_id = z.id WHERE c.centre_code = $1',
      [centre_code]
    );
    if (!centreRes.rows[0]) return res.status(404).json({ success: false, message: 'Centre not found' });
    const centre = centreRes.rows[0];

    // Staff attendance
    const staff = await query(
      `SELECT u.id, u.username, u.full_name, u.role, u.phone,
              s.server_code, s.is_primary,
              sa.reported_at, sa.selfie_url, sa.geo_lat, sa.geo_lng, sa.is_submitted
       FROM users u
       LEFT JOIN servers s ON u.server_id = s.id
       LEFT JOIN staff_attendance sa ON sa.user_id = u.id AND sa.exam_date = $2
       WHERE u.centre_id = $1 AND u.is_active = TRUE
         AND u.role IN ('server_manager','event_manager','biometric_staff')
       ORDER BY u.role, u.username`,
      [centre.id, date]
    );

    // Mock checklist + photos (if mock)
    let checklist = null, photos = [];
    if (exam_type === 'mock') {
      const cl = await query('SELECT * FROM mock_checklist WHERE centre_id=$1 AND exam_date=$2', [centre.id, date]);
      checklist = cl.rows[0] || null;
      const ph = await query('SELECT photo_type, photo_url FROM mock_photos WHERE centre_id=$1 AND exam_date=$2', [centre.id, date]);
      photos = ph.rows;
    } else {
      const cl = await query('SELECT * FROM live_checklist WHERE centre_id=$1 AND exam_date=$2', [centre.id, date]);
      checklist = cl.rows[0] || null;
    }

    // Batch attendance (live only)
    const batches = await query(
      `SELECT ba.section_code, ba.registered, ba.present, ba.absent, ba.is_submitted, s.server_code
       FROM batch_attendance ba
       JOIN servers s ON ba.server_id = s.id
       WHERE ba.centre_id = $1 AND ba.exam_date = $2
       ORDER BY s.server_code, ba.section_code`,
      [centre.id, date]
    );

    // Issues
    const issues = await query(
      `SELECT i.*, u.full_name,
              json_agg(ip.photo_url) FILTER (WHERE ip.photo_url IS NOT NULL) AS photos
       FROM issues i
       JOIN users u ON i.reported_by = u.id
       LEFT JOIN issue_photos ip ON ip.issue_id = i.id
       WHERE i.centre_id = $1 AND i.exam_date = $2
       GROUP BY i.id, u.full_name
       ORDER BY i.created_at DESC`,
      [centre.id, date]
    );

    res.json({
      success: true,
      centre,
      date,
      exam_type,
      staff:    staff.rows,
      checklist,
      photos,
      batches:  batches.rows,
      issues:   issues.rows,
    });
  } catch (err) { next(err); }
};

module.exports = { getZoneDashboard, getMasterDashboard, getCentreDetail };
