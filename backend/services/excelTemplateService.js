// services/excelTemplateService.js
const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

const TEMPLATE_DIR = path.join(__dirname, '../uploads/templates');

const HEADER_STYLE = {
  font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill:      { fgColor: { rgb: '1E3A5F' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};
const NOTE_STYLE   = { font: { italic: true, color: { rgb: '7F6000' }, sz: 9 }, fill: { fgColor: { rgb: 'FFF2CC' } } };
const ROW_A        = { fill: { fgColor: { rgb: 'FFFFFF' } } };
const ROW_B        = { fill: { fgColor: { rgb: 'F2F7FF' } } };

const buildSheet = ({ headers, samples, colWidths, notes = [] }) => {
  const wsData = [headers, ...samples.map(r => headers.map(h => r[h] ?? '')), []];
  notes.forEach(n => wsData.push([`⚠  ${n}`]));
  const ws        = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols']     = colWidths.map(w => ({ wch: w }));
  ws['!rows']     = [{ hpt: 22 }];
  headers.forEach((_, c) => {
    const a = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[a]) ws[a].s = HEADER_STYLE;
  });
  samples.forEach((_, ri) => {
    const s = ri % 2 === 0 ? ROW_A : ROW_B;
    headers.forEach((_, c) => {
      const a = XLSX.utils.encode_cell({ r: ri + 1, c });
      if (ws[a]) ws[a].s = s;
    });
  });
  const ns = samples.length + 2;
  notes.forEach((_, ni) => {
    const a = XLSX.utils.encode_cell({ r: ns + ni, c: 0 });
    if (ws[a]) ws[a].s = NOTE_STYLE;
  });
  return ws;
};

const SHEETS = {
  Zones: {
    headers:   ['zone_id', 'zone_name', 'state'],
    samples:   [
      { zone_id: 'SOUTH_TN', zone_name: 'South Tamil Nadu', state: 'Tamil Nadu' },
      { zone_id: 'NORTH_TN', zone_name: 'North Tamil Nadu', state: 'Tamil Nadu' },
      { zone_id: 'CENTRAL',  zone_name: 'Central Region',   state: 'Madhya Pradesh' },
    ],
    colWidths: [15, 25, 20],
    notes:     ['zone_id: unique code, no spaces', 'state: full state name'],
  },
  Centres: {
    headers:   ['zone_id', 'centre_code', 'centre_name', 'state', 'city', 'address', 'google_map_link', 'total_capacity'],
    samples:   [
      { zone_id: 'SOUTH_TN', centre_code: 'CAP01', centre_name: 'Chennai Centre', state: 'Tamil Nadu', city: 'Chennai', address: 'Anna Nagar, Chennai', google_map_link: 'https://maps.google.com/?q=CAP01', total_capacity: 350 },
      { zone_id: 'SOUTH_TN', centre_code: 'CAP02', centre_name: 'Coimbatore Centre', state: 'Tamil Nadu', city: 'Coimbatore', address: 'RS Puram, Coimbatore', google_map_link: 'https://maps.google.com/?q=CAP02', total_capacity: 240 },
      { zone_id: 'NORTH_TN', centre_code: 'CAP03', centre_name: 'Madurai Centre', state: 'Tamil Nadu', city: 'Madurai', address: 'Anna Nagar, Madurai', google_map_link: 'https://maps.google.com/?q=CAP03', total_capacity: 100 },
    ],
    colWidths: [12, 14, 22, 16, 14, 28, 38, 15],
    notes:     ['zone_id must match Zones sheet', 'state must match the zone state'],
  },
  Servers: {
    headers:   ['centre_code', 'server_code', 'capacity', 'primary_server'],
    samples:   [
      { centre_code: 'CAP01', server_code: 'CAP01A', capacity: 120, primary_server: 'YES' },
      { centre_code: 'CAP01', server_code: 'CAP01B', capacity: 120, primary_server: 'NO'  },
      { centre_code: 'CAP01', server_code: 'CAP01C', capacity: 110, primary_server: 'NO'  },
      { centre_code: 'CAP02', server_code: 'CAP02A', capacity: 120, primary_server: 'YES' },
      { centre_code: 'CAP02', server_code: 'CAP02B', capacity: 120, primary_server: 'NO'  },
      { centre_code: 'CAP03', server_code: 'CAP03A', capacity: 100, primary_server: 'YES' },
    ],
    colWidths: [14, 14, 12, 16],
    notes:     ['primary_server: YES (must end with A) or NO', 'capacity: max 140', 'Only ONE YES per centre'],
  },
  Exam_Schedule: {
    headers:   ['server_code', 'exam_date', 'section_code', 'exam_type'],
    samples:   [
      { server_code: 'CAP01A', exam_date: '2026-04-20', section_code: 'MOCK', exam_type: 'mock' },
      { server_code: 'CAP01B', exam_date: '2026-04-20', section_code: 'MOCK', exam_type: 'mock' },
      { server_code: 'CAP01C', exam_date: '2026-04-20', section_code: 'MOCK', exam_type: 'mock' },
      { server_code: 'CAP01A', exam_date: '2026-04-24', section_code: 'B1',   exam_type: 'live' },
      { server_code: 'CAP01A', exam_date: '2026-04-24', section_code: 'B2',   exam_type: 'live' },
      { server_code: 'CAP01A', exam_date: '2026-04-24', section_code: 'B3',   exam_type: 'live' },
      { server_code: 'CAP01B', exam_date: '2026-04-24', section_code: 'B1',   exam_type: 'live' },
      { server_code: 'CAP01B', exam_date: '2026-04-24', section_code: 'B2',   exam_type: 'live' },
      { server_code: 'CAP01B', exam_date: '2026-04-24', section_code: 'B3',   exam_type: 'live' },
    ],
    colWidths: [15, 14, 14, 12],
    notes:     ['exam_type: "mock" or "live" only', 'Mock: one row per server (section_code=MOCK)', 'Live: three rows per server (B1+B2+B3)', 'exam_date: YYYY-MM-DD format'],
  },
  Users: {
    headers:   ['username', 'password', 'full_name', 'role', 'server_code', 'centre_code', 'zone_id', 'phone'],
    samples:   [
      { username: 'SM_CAP01A',   password: 'Pass@1234',  full_name: 'Ravi Kumar',      role: 'server_manager',  server_code: 'CAP01A', centre_code: '',      zone_id: '',        phone: '9876543210' },
      { username: 'SM_CAP01B',   password: 'Pass@1234',  full_name: 'Priya S',          role: 'server_manager',  server_code: 'CAP01B', centre_code: '',      zone_id: '',        phone: '9876543211' },
      { username: 'EM_CAP01_1',  password: 'Pass@1234',  full_name: 'Event Manager 1',  role: 'event_manager',   server_code: '',       centre_code: 'CAP01', zone_id: '',        phone: '9876543220' },
      { username: 'BIO_CAP01_1', password: 'Pass@1234',  full_name: 'Bio Staff 1',      role: 'biometric_staff', server_code: '',       centre_code: 'CAP01', zone_id: '',        phone: '9876543230' },
      { username: 'ZA_SOUTH_TN', password: 'Pass@1234',  full_name: 'Zone Admin South', role: 'zone_admin',      server_code: '',       centre_code: '',      zone_id: 'SOUTH_TN',phone: '9876543240' },
      { username: 'ADMIN',       password: 'Admin@2024', full_name: 'Master Admin',      role: 'master_admin',    server_code: '',       centre_code: '',      zone_id: '',        phone: '9876543250' },
    ],
    colWidths: [16, 12, 22, 18, 14, 14, 12, 14],
    notes:     [
      'server_manager  → fill server_code only',
      'event_manager   → fill centre_code only',
      'biometric_staff → fill centre_code only',
      'zone_admin      → fill zone_id only',
      'master_admin    → leave all FK columns blank',
    ],
  },
};

const generateTemplate = () => {
  if (!fs.existsSync(TEMPLATE_DIR)) fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  const wb = XLSX.utils.book_new();
  ['Zones','Centres','Servers','Exam_Schedule','Users'].forEach(name => {
    XLSX.utils.book_append_sheet(wb, buildSheet(SHEETS[name]), name);
  });

  const readme = XLSX.utils.aoa_to_sheet([
    ['ExamOps — Configuration Excel Template'],[''],
    ['UPLOAD ORDER:'],
    ['  1. Zones         → zone_id, zone_name, state'],
    ['  2. Centres       → zone_id, centre_code, centre_name, state, city, address, google_map_link, total_capacity'],
    ['  3. Servers       → centre_code, server_code, capacity, primary_server (YES/NO)'],
    ['  4. Exam_Schedule → server_code, exam_date, section_code, exam_type (mock/live)'],
    ['  5. Users         → username, password, full_name, role, server_code, centre_code, zone_id, phone'],
    [''],
    ['BATCH TIMINGS — FIXED (do not add to Excel):'],
    ['  B1 → 09:00 – 11:30'],
    ['  B2 → 12:30 – 15:00'],
    ['  B3 → 16:00 – 18:30'],
    [''],
    ['RULES:'],
    ['  • Mock day  → one row per server, section_code = MOCK'],
    ['  • Live day  → three rows per server (B1, B2, B3)'],
    ['  • Same centre cannot have mock AND live on same date'],
    ['  • Only ONE primary server per centre (YES)'],
    ['  • Server capacity max 140'],
  ]);
  readme['!cols'] = [{ wch: 70 }];
  readme['A1'].s  = { font: { bold: true, sz: 12 } };
  XLSX.utils.book_append_sheet(wb, readme, 'README');

  const filePath = path.join(TEMPLATE_DIR, 'ExamOps_Config_Template.xlsx');
  XLSX.writeFile(wb, filePath);
  return filePath;
};

module.exports = { generateTemplate };
