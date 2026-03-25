// services/excelImportService.js
const XLSX   = require('xlsx');
const bcrypt = require('bcryptjs');
const { getClient } = require('../config/db');

const VALID_ROLES = ['master_admin','zone_admin','server_manager','event_manager','biometric_staff'];

// ── Convert ANY date format to YYYY-MM-DD string ─────────────
const toDateString = (val) => {
  if (!val && val !== 0) return null;
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    return null;
  }
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number') {
    // Excel serial number (e.g. 46104)
    const base = new Date(1899, 11, 30);
    base.setDate(base.getDate() + Math.floor(val));
    return base.toISOString().split('T')[0];
  }
  return null;
};

const parseWorkbook = (filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheets = {};
  workbook.SheetNames.forEach(name => {
    sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' });
  });
  return sheets;
};

const validateSheets = (sheets) => {
  const errors = {};

  if (sheets['Zones']) {
    const rows = sheets['Zones'].filter(r => r.zone_id?.toString().trim());
    const errs = rows.flatMap((r, i) => {
      const e = [];
      if (!r.zone_id?.toString().trim())   e.push(`Row ${i+2}: zone_id is required`);
      if (!r.zone_name?.toString().trim()) e.push(`Row ${i+2}: zone_name is required`);
      if (!r.state?.toString().trim())     e.push(`Row ${i+2}: state is required`);
      return e;
    });
    if (errs.length) errors['Zones'] = errs;
  }

  if (sheets['Centres']) {
    const rows = sheets['Centres'].filter(r => r.centre_code?.toString().trim());
    const errs = rows.flatMap((r, i) => {
      const e = [];
      if (!r.zone_id?.toString().trim())     e.push(`Row ${i+2}: zone_id is required`);
      if (!r.centre_code?.toString().trim()) e.push(`Row ${i+2}: centre_code is required`);
      if (!r.centre_name?.toString().trim()) e.push(`Row ${i+2}: centre_name is required`);
      if (!r.state?.toString().trim())       e.push(`Row ${i+2}: state is required`);
      if (!r.city?.toString().trim())        e.push(`Row ${i+2}: city is required`);
      const cap = parseInt(r.total_capacity);
      if (isNaN(cap) || cap <= 0)            e.push(`Row ${i+2}: total_capacity must be positive`);
      return e;
    });
    if (errs.length) errors['Centres'] = errs;
  }

  if (sheets['Servers']) {
    const rows = sheets['Servers'].filter(r => r.server_code?.toString().trim());
    const seenPrimary = new Map();
    const errs = rows.flatMap((r, i) => {
      const e = [];
      if (!r.centre_code?.toString().trim()) e.push(`Row ${i+2}: centre_code is required`);
      if (!r.server_code?.toString().trim()) e.push(`Row ${i+2}: server_code is required`);
      const cap = parseInt(r.capacity);
      if (isNaN(cap) || cap <= 0)            e.push(`Row ${i+2}: capacity must be positive`);
      if (cap > 140)                         e.push(`Row ${i+2}: capacity ${cap} exceeds max 140`);
      const cc = r.centre_code?.toString().trim().toUpperCase();
      const isPrimary = r.primary_server?.toString().trim().toUpperCase() === 'YES';
      if (isPrimary) {
        if (seenPrimary.has(cc)) e.push(`Row ${i+2}: Centre ${cc} already has a primary server`);
        else seenPrimary.set(cc, true);
      }
      return e;
    });
    if (errs.length) errors['Servers'] = errs;
  }

  if (sheets['Exam_Schedule']) {
    const rows = sheets['Exam_Schedule'].filter(r => r.server_code?.toString().trim());
    const errs = rows.flatMap((r, i) => {
      const e = [];
      if (!r.server_code?.toString().trim())  e.push(`Row ${i+2}: server_code is required`);
      const dateStr = toDateString(r.exam_date);
      if (!dateStr) e.push(`Row ${i+2}: exam_date is invalid (use YYYY-MM-DD format)`);
      if (!r.section_code?.toString().trim()) e.push(`Row ${i+2}: section_code is required`);
      const et = r.exam_type?.toString().trim().toLowerCase();
      if (!['mock','live'].includes(et))      e.push(`Row ${i+2}: exam_type must be "mock" or "live"`);
      return e;
    });
    if (errs.length) errors['Exam_Schedule'] = errs;
  }

  if (sheets['Users']) {
    const rows = sheets['Users'].filter(r => r.username?.toString().trim());
    const errs = rows.flatMap((r, i) => {
      const e = [];
      if (!r.username?.toString().trim()) e.push(`Row ${i+2}: username is required`);
      if (!r.password?.toString().trim()) e.push(`Row ${i+2}: password is required`);
      const role = r.role?.toString().trim().toLowerCase();
      if (!VALID_ROLES.includes(role)) {
        e.push(`Row ${i+2}: invalid role "${role}"`);
        return e;
      }
      if (role === 'server_manager'  && !r.server_code?.toString().trim()) e.push(`Row ${i+2}: server_manager requires server_code`);
      if (role === 'event_manager'   && !r.centre_code?.toString().trim()) e.push(`Row ${i+2}: event_manager requires centre_code`);
      if (role === 'biometric_staff' && !r.centre_code?.toString().trim()) e.push(`Row ${i+2}: biometric_staff requires centre_code`);
      if (role === 'zone_admin'      && !r.zone_id?.toString().trim())     e.push(`Row ${i+2}: zone_admin requires zone_id`);
      return e;
    });
    if (errs.length) errors['Users'] = errs;
  }

  return { valid: Object.keys(errors).length === 0, errors };
};

const importFromExcel = async (filePath, importedByUserId = null) => {
  const sheets = parseWorkbook(filePath);
  const { valid, errors } = validateSheets(sheets);

  if (!valid) {
    return { success: false, message: 'Validation failed. No records were imported.', errors };
  }

  const client  = await getClient();
  const summary = {};

  try {
    await client.query('BEGIN');

    // ── Zones ──────────────────────────────────────────────
    if (sheets['Zones']) {
      let inserted = 0, updated = 0;
      const rows   = sheets['Zones'].filter(r => r.zone_id?.toString().trim());
      const unique = [...new Map(rows.map(r => [r.zone_id?.toString().trim().toUpperCase(), r])).values()];
      for (const row of unique) {
        const r = await client.query(
          `INSERT INTO zones (zone_code, zone_name, state)
           VALUES ($1,$2,$3)
           ON CONFLICT (zone_code) DO UPDATE SET zone_name=$2, state=$3, updated_at=NOW()
           RETURNING (xmax=0) AS was_inserted`,
          [row.zone_id.toString().trim().toUpperCase(), row.zone_name.toString().trim(), row.state.toString().trim()]
        );
        r.rows[0]?.was_inserted ? inserted++ : updated++;
      }
      summary.zones = { inserted, updated };
    }

    // ── Centres ────────────────────────────────────────────
    if (sheets['Centres']) {
      let inserted = 0, updated = 0, skipped = 0;
      const rows = sheets['Centres'].filter(r => r.centre_code?.toString().trim());
      for (const row of rows) {
        const zone_code   = row.zone_id?.toString().trim().toUpperCase();
        const centre_code = row.centre_code?.toString().trim().toUpperCase();
        const zr = await client.query('SELECT id FROM zones WHERE zone_code=$1', [zone_code]);
        if (!zr.rows[0]) { skipped++; continue; }
        const r = await client.query(
          `INSERT INTO centres (centre_code, centre_name, zone_id, state, city, address, google_map_link, total_capacity)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (centre_code) DO UPDATE SET
             centre_name=$2, zone_id=$3, state=$4, city=$5, address=$6, google_map_link=$7, total_capacity=$8, updated_at=NOW()
           RETURNING (xmax=0) AS was_inserted`,
          [centre_code, row.centre_name?.toString().trim(), zr.rows[0].id,
           row.state?.toString().trim(), row.city?.toString().trim(),
           row.address?.toString().trim() || null, row.google_map_link?.toString().trim() || null,
           parseInt(row.total_capacity) || 0]
        );
        r.rows[0]?.was_inserted ? inserted++ : updated++;
      }
      summary.centres = { inserted, updated, skipped };
    }

    // ── Servers ────────────────────────────────────────────
    if (sheets['Servers']) {
      let inserted = 0, updated = 0, skipped = 0;
      const rows = sheets['Servers'].filter(r => r.server_code?.toString().trim());
      for (const row of rows) {
        const server_code = row.server_code?.toString().trim().toUpperCase();
        const centre_code = row.centre_code?.toString().trim().toUpperCase();
        const capacity    = parseInt(row.capacity) || 0;
        const is_primary  = row.primary_server?.toString().trim().toUpperCase() === 'YES';
        if (capacity > 140) { skipped++; continue; }
        const cr = await client.query('SELECT id FROM centres WHERE centre_code=$1', [centre_code]);
        if (!cr.rows[0]) { skipped++; continue; }
        if (is_primary) {
          await client.query('UPDATE servers SET is_primary=FALSE WHERE centre_id=$1 AND server_code!=$2', [cr.rows[0].id, server_code]);
        }
        const r = await client.query(
          `INSERT INTO servers (server_code, centre_id, is_primary, capacity)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (server_code) DO UPDATE SET centre_id=$2, is_primary=$3, capacity=$4, updated_at=NOW()
           RETURNING (xmax=0) AS was_inserted`,
          [server_code, cr.rows[0].id, is_primary, capacity]
        );
        r.rows[0]?.was_inserted ? inserted++ : updated++;
      }
      summary.servers = { inserted, updated, skipped };
    }

    // ── Exam Schedule ──────────────────────────────────────
    if (sheets['Exam_Schedule']) {
      let inserted = 0, skipped = 0;
      const rows = sheets['Exam_Schedule'].filter(r => r.server_code?.toString().trim());
      for (const row of rows) {
        const server_code  = row.server_code?.toString().trim().toUpperCase();
        const section_code = row.section_code?.toString().trim().toUpperCase();
        const exam_date    = toDateString(row.exam_date);  // ← auto convert any format
        const exam_type    = row.exam_type?.toString().trim().toLowerCase() === 'mock' ? 'mock' : 'live';
        if (!exam_date) { skipped++; continue; }
        const sr = await client.query('SELECT id FROM servers WHERE server_code=$1', [server_code]);
        if (!sr.rows[0]) { skipped++; continue; }
        await client.query(
          `INSERT INTO session_schedule (server_id, exam_date, section_code, exam_type)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (server_id, exam_date, section_code) DO UPDATE SET exam_type=$4`,
          [sr.rows[0].id, exam_date, section_code, exam_type]
        );
        inserted++;
      }
      summary.exam_schedule = { inserted, skipped };
    }

    // ── Users ──────────────────────────────────────────────
    if (sheets['Users']) {
      let inserted = 0, updated = 0, skipped = 0;
      const rows = sheets['Users'].filter(r => r.username?.toString().trim());
      for (const row of rows) {
        const username = row.username?.toString().trim().toUpperCase();
        const role     = row.role?.toString().trim().toLowerCase();
        const password = row.password?.toString().trim();
        if (!username || !role || !password) { skipped++; continue; }
        const password_hash = await bcrypt.hash(password, 10);

        let centre_id = null, server_id = null, zone_id = null;
        if (role === 'server_manager' && row.server_code?.toString().trim()) {
          const sr = await client.query('SELECT id, centre_id FROM servers WHERE server_code=$1',
            [row.server_code.toString().trim().toUpperCase()]);
          if (sr.rows[0]) { server_id = sr.rows[0].id; centre_id = sr.rows[0].centre_id; }
        }
        if (['event_manager','biometric_staff'].includes(role) && row.centre_code?.toString().trim()) {
          const cr = await client.query('SELECT id FROM centres WHERE centre_code=$1',
            [row.centre_code.toString().trim().toUpperCase()]);
          centre_id = cr.rows[0]?.id || null;
        }
        if (role === 'zone_admin' && row.zone_id?.toString().trim()) {
          const zr = await client.query('SELECT id FROM zones WHERE zone_code=$1',
            [row.zone_id.toString().trim().toUpperCase()]);
          zone_id = zr.rows[0]?.id || null;
        }

        const r = await client.query(
          `INSERT INTO users (username, password_hash, full_name, role, centre_id, server_id, zone_id, phone)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (username) DO UPDATE SET
             password_hash=$2, full_name=$3, role=$4, centre_id=$5, server_id=$6, zone_id=$7, phone=$8, updated_at=NOW()
           RETURNING (xmax=0) AS was_inserted`,
          [username, password_hash, row.full_name?.toString().trim() || username,
           role, centre_id, server_id, zone_id, row.phone?.toString().trim() || null]
        );
        r.rows[0]?.was_inserted ? inserted++ : updated++;
      }
      summary.users = { inserted, updated, skipped };
    }

    await client.query(
      `INSERT INTO import_log (imported_by, filename, status, summary) VALUES ($1,$2,'success',$3)`,
      [importedByUserId, filePath.split('/').pop(), JSON.stringify(summary)]
    );

    await client.query('COMMIT');
    return { success: true, message: 'Import completed successfully.', summary };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { importFromExcel };
