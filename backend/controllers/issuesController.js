// controllers/issuesController.js
const { query }            = require('../config/db')
const { uploadToSupabase } = require('../services/storageService')
const path = require('path')

// POST report an issue
const reportIssue = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { issue_type, severity, section_code, app_roll_no, description, exam_type } = req.body

    if (!issue_type || !severity || !description) {
      return res.status(400).json({ success: false, message: 'issue_type, severity and description are required' })
    }

    const result = await query(
      `INSERT INTO issues (reported_by, centre_id, server_id, exam_date, exam_type, section_code, issue_type, severity, app_roll_no, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [req.user.id, req.user.centre_id, req.user.server_id, today,
       exam_type || 'live', section_code || null, issue_type, severity, app_roll_no || null, description]
    )

    const issue_id = result.rows[0].id

    // Upload evidence photos from buffer
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ext         = path.extname(file.originalname).toLowerCase() || '.jpg'
        const mimetype    = file.mimetype || 'image/jpeg'
        const storagePath = `issues/${issue_id}_${Date.now()}${ext}`
        const url         = await uploadToSupabase(file.buffer, storagePath, mimetype)
        await query('INSERT INTO issue_photos (issue_id, photo_url) VALUES ($1,$2)', [issue_id, url])
      }
    }

    res.json({ success: true, message: 'Issue reported', issue_id })
  } catch (err) { next(err) }
}

// GET issues for a centre
const getCentreIssues = async (req, res, next) => {
  try {
    const { centre_code } = req.params
    const date = req.query.date || new Date().toISOString().split('T')[0]

    const result = await query(
      `SELECT i.*, u.username, u.full_name,
              json_agg(ip.photo_url) FILTER (WHERE ip.photo_url IS NOT NULL) AS photos
       FROM issues i
       JOIN centres c ON i.centre_id = c.id
       JOIN users   u ON i.reported_by = u.id
       LEFT JOIN issue_photos ip ON ip.issue_id = i.id
       WHERE c.centre_code = $1 AND i.exam_date = $2
       GROUP BY i.id, u.username, u.full_name
       ORDER BY i.created_at DESC`,
      [centre_code, date]
    )

    res.json({ success: true, issues: result.rows })
  } catch (err) { next(err) }
}

// GET all issues feed (master admin)
const getAllIssues = async (req, res, next) => {
  try {
    const date      = req.query.date     || new Date().toISOString().split('T')[0]
    const status    = req.query.status   || 'open'
    const exam_type = req.query.exam_type
    const severity  = req.query.severity

    let sql = `
      SELECT i.*, u.username, u.full_name,
             c.centre_code, c.centre_name, c.city,
             z.zone_code, z.zone_name,
             json_agg(ip.photo_url) FILTER (WHERE ip.photo_url IS NOT NULL) AS photos
      FROM issues i
      JOIN users   u ON i.reported_by = u.id
      JOIN centres c ON i.centre_id   = c.id
      JOIN zones   z ON c.zone_id     = z.id
      LEFT JOIN issue_photos ip ON ip.issue_id = i.id
      WHERE i.exam_date = $1 AND i.status = $2`

    const params = [date, status]
    if (exam_type) { sql += ` AND i.exam_type = $${params.length + 1}`; params.push(exam_type) }
    if (severity)  { sql += ` AND i.severity = $${params.length + 1}`;  params.push(severity) }
    sql += ' GROUP BY i.id, u.username, u.full_name, c.centre_code, c.centre_name, c.city, z.zone_code, z.zone_name'
    sql += ` ORDER BY CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, i.created_at DESC`

    const result = await query(sql, params)
    res.json({ success: true, issues: result.rows })
  } catch (err) { next(err) }
}

// PATCH update issue status
const updateIssueStatus = async (req, res, next) => {
  try {
    const { id }     = req.params
    const { status } = req.body
    if (!['open','in_progress','resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }
    await query(
      `UPDATE issues
       SET status = $1,
           resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $2`,
      [status, id]
    )
    res.json({ success: true, message: 'Issue status updated' })
  } catch (err) { next(err) }
}

module.exports = { reportIssue, getCentreIssues, getAllIssues, updateIssueStatus }
