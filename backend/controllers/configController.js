// controllers/configController.js
const { query }          = require('../config/db');
const { importFromExcel } = require('../services/excelImportService');
const path = require('path');
const fs   = require('fs');

// POST import Excel
const importExcel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No Excel file uploaded. Field name must be "excel".' });
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!['.xlsx','.xls'].includes(ext)) return res.status(400).json({ success: false, message: 'Upload .xlsx or .xls only' });

    const result = await importFromExcel(req.file.path, req.user.id);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    if (!result.success) {
      return res.status(422).json({ success: false, message: result.message, errors: result.errors });
    }
    res.json({ success: true, message: result.message, summary: result.summary });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(err);
  }
};

// GET system status counts
const getStatus = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM zones    WHERE is_active=TRUE) AS zones,
        (SELECT COUNT(*) FROM centres  WHERE is_active=TRUE) AS centres,
        (SELECT COUNT(*) FROM servers  WHERE is_active=TRUE) AS servers,
        (SELECT COUNT(*) FROM users    WHERE is_active=TRUE) AS users,
        (SELECT COUNT(*) FROM session_schedule)              AS schedules,
        (SELECT COUNT(*) FROM servers  WHERE is_primary=TRUE AND is_active=TRUE) AS primary_servers
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// GET import log
const getImportLog = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT il.*, u.username AS imported_by_username
       FROM import_log il
       LEFT JOIN users u ON il.imported_by = u.id
       ORDER BY il.imported_at DESC LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// GET download template
const downloadTemplate = async (req, res, next) => {
  try {
    const { generateTemplate } = require('../services/excelTemplateService');
    const filePath = generateTemplate();
    res.download(filePath, 'ExamOps_Config_Template.xlsx', err => {
      if (err && !res.headersSent) next(err);
    });
  } catch (err) { next(err); }
};

module.exports = { importExcel, getStatus, getImportLog, downloadTemplate };
