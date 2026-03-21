// controllers/reportsController.js
const { query } = require('../config/db');
const ExcelJS   = require('exceljs');

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Arial', size: 10 };
const ALT_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F7FF' } };

const styleHeader = (row) => {
  row.eachCell(cell => {
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF4472C4' } } };
  });
  row.height = 22;
};

// GET zone wise attendance summary (Excel)
const getZoneSummaryExcel = async (req, res, next) => {
  try {
    const date      = req.query.date || new Date().toISOString().split('T')[0];
    const exam_type = req.query.exam_type || 'live';

    const result = await query(
      `SELECT z.zone_code, z.zone_name, z.state,
              COUNT(DISTINCT c.id) AS total_centres,
              COUNT(DISTINCT CASE WHEN sa.exam_date = $1 AND sa.reported_at IS NOT NULL THEN u.id END) AS staff_reported,
              COUNT(DISTINCT CASE WHEN u.role IN ('server_manager','event_manager','biometric_staff') THEN u.id END) AS total_staff,
              COALESCE(SUM(CASE WHEN ba.exam_date=$1 AND ba.section_code='B1' THEN ba.registered ELSE 0 END),0) AS b1_registered,
              COALESCE(SUM(CASE WHEN ba.exam_date=$1 AND ba.section_code='B1' THEN ba.present ELSE 0 END),0) AS b1_present,
              COALESCE(SUM(CASE WHEN ba.exam_date=$1 AND ba.section_code='B2' THEN ba.registered ELSE 0 END),0) AS b2_registered,
              COALESCE(SUM(CASE WHEN ba.exam_date=$1 AND ba.section_code='B2' THEN ba.present ELSE 0 END),0) AS b2_present,
              COALESCE(SUM(CASE WHEN ba.exam_date=$1 AND ba.section_code='B3' THEN ba.registered ELSE 0 END),0) AS b3_registered,
              COALESCE(SUM(CASE WHEN ba.exam_date=$1 AND ba.section_code='B3' THEN ba.present ELSE 0 END),0) AS b3_present,
              COUNT(DISTINCT CASE WHEN i.exam_date=$1 AND i.status='open' THEN i.id END) AS open_issues
       FROM zones z
       LEFT JOIN centres c  ON c.zone_id = z.id AND c.is_active=TRUE
       LEFT JOIN users u    ON u.centre_id = c.id AND u.is_active=TRUE
       LEFT JOIN staff_attendance sa ON sa.user_id = u.id
       LEFT JOIN batch_attendance ba ON ba.centre_id = c.id
       LEFT JOIN issues i   ON i.centre_id = c.id
       WHERE z.is_active=TRUE
       GROUP BY z.id, z.zone_code, z.zone_name, z.state
       ORDER BY z.zone_name`,
      [date]
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Zone Summary');

    ws.columns = [
      { header: 'Zone Code',      key: 'zone_code',     width: 15 },
      { header: 'Zone Name',      key: 'zone_name',     width: 22 },
      { header: 'State',          key: 'state',         width: 18 },
      { header: 'Total Centres',  key: 'total_centres', width: 14 },
      { header: 'Total Staff',    key: 'total_staff',   width: 12 },
      { header: 'Staff Reported', key: 'staff_reported',width: 14 },
      { header: 'B1 Registered',  key: 'b1_registered', width: 14 },
      { header: 'B1 Present',     key: 'b1_present',    width: 12 },
      { header: 'B2 Registered',  key: 'b2_registered', width: 14 },
      { header: 'B2 Present',     key: 'b2_present',    width: 12 },
      { header: 'B3 Registered',  key: 'b3_registered', width: 14 },
      { header: 'B3 Present',     key: 'b3_present',    width: 12 },
      { header: 'Open Issues',    key: 'open_issues',   width: 12 },
    ];

    styleHeader(ws.getRow(1));
    result.rows.forEach((row, i) => {
      const r = ws.addRow(row);
      if (i % 2 === 1) r.eachCell(cell => { cell.fill = ALT_FILL; });
      r.font = { name: 'Arial', size: 10 };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=zone_summary_${date}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

// GET centre wise detailed report (Excel)
const getCentreDetailExcel = async (req, res, next) => {
  try {
    const date      = req.query.date || new Date().toISOString().split('T')[0];
    const exam_type = req.query.exam_type || 'live';

    const result = await query(
      `SELECT z.zone_name, z.state, c.centre_code, c.centre_name, c.city,
              s.server_code, s.is_primary, s.capacity,
              u.username, u.full_name, u.role, u.phone,
              sa.reported_at, sa.is_submitted AS attendance_submitted,
              ba_b1.registered AS b1_registered, ba_b1.present AS b1_present, ba_b1.absent AS b1_absent,
              ba_b2.registered AS b2_registered, ba_b2.present AS b2_present, ba_b2.absent AS b2_absent,
              ba_b3.registered AS b3_registered, ba_b3.present AS b3_present, ba_b3.absent AS b3_absent,
              lc.security_reached, lc.security_male_count, lc.security_female_count, lc.hhmd_available,
              (SELECT COUNT(*) FROM issues i WHERE i.centre_id=c.id AND i.exam_date=$1 AND i.status='open') AS open_issues
       FROM centres c
       JOIN zones z ON c.zone_id = z.id
       LEFT JOIN servers s ON s.centre_id = c.id AND s.is_active=TRUE
       LEFT JOIN users u ON u.server_id = s.id AND u.role='server_manager' AND u.is_active=TRUE
       LEFT JOIN staff_attendance sa ON sa.user_id = u.id AND sa.exam_date = $1
       LEFT JOIN batch_attendance ba_b1 ON ba_b1.server_id=s.id AND ba_b1.exam_date=$1 AND ba_b1.section_code='B1'
       LEFT JOIN batch_attendance ba_b2 ON ba_b2.server_id=s.id AND ba_b2.exam_date=$1 AND ba_b2.section_code='B2'
       LEFT JOIN batch_attendance ba_b3 ON ba_b3.server_id=s.id AND ba_b3.exam_date=$1 AND ba_b3.section_code='B3'
       LEFT JOIN live_checklist lc ON lc.centre_id=c.id AND lc.exam_date=$1
       WHERE c.is_active=TRUE
       ORDER BY z.zone_name, c.centre_code, s.server_code`,
      [date]
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Centre Detail');

    ws.columns = [
      { header: 'Zone',          key: 'zone_name',           width: 20 },
      { header: 'State',         key: 'state',               width: 16 },
      { header: 'Centre Code',   key: 'centre_code',         width: 14 },
      { header: 'Centre Name',   key: 'centre_name',         width: 24 },
      { header: 'City',          key: 'city',                width: 14 },
      { header: 'Server',        key: 'server_code',         width: 12 },
      { header: 'Primary',       key: 'is_primary',          width: 9  },
      { header: 'SM Name',       key: 'full_name',           width: 20 },
      { header: 'SM Phone',      key: 'phone',               width: 14 },
      { header: 'Reported At',   key: 'reported_at',         width: 18 },
      { header: 'B1 Registered', key: 'b1_registered',       width: 14 },
      { header: 'B1 Present',    key: 'b1_present',          width: 12 },
      { header: 'B1 Absent',     key: 'b1_absent',           width: 10 },
      { header: 'B2 Registered', key: 'b2_registered',       width: 14 },
      { header: 'B2 Present',    key: 'b2_present',          width: 12 },
      { header: 'B2 Absent',     key: 'b2_absent',           width: 10 },
      { header: 'B3 Registered', key: 'b3_registered',       width: 14 },
      { header: 'B3 Present',    key: 'b3_present',          width: 12 },
      { header: 'B3 Absent',     key: 'b3_absent',           width: 10 },
      { header: 'Security',      key: 'security_reached',    width: 10 },
      { header: 'Male Guards',   key: 'security_male_count', width: 12 },
      { header: 'Female Guards', key: 'security_female_count',width:12 },
      { header: 'HHMD',          key: 'hhmd_available',      width: 8  },
      { header: 'Open Issues',   key: 'open_issues',         width: 12 },
    ];

    styleHeader(ws.getRow(1));
    result.rows.forEach((row, i) => {
      const r = ws.addRow(row);
      if (i % 2 === 1) r.eachCell(cell => { cell.fill = ALT_FILL; });
      r.font = { name: 'Arial', size: 10 };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=centre_detail_${date}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

module.exports = { getZoneSummaryExcel, getCentreDetailExcel };
