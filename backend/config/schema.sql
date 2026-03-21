-- ═══════════════════════════════════════════════════════════
--  ExamOps — Full Database Schema
-- ═══════════════════════════════════════════════════════════

-- ── ZONES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zones (
  id         SERIAL PRIMARY KEY,
  zone_code  VARCHAR(30) NOT NULL,
  zone_name  VARCHAR(100) NOT NULL,
  state      VARCHAR(100) NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_zone_code UNIQUE (zone_code)
);

-- ── CENTRES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS centres (
  id              SERIAL PRIMARY KEY,
  centre_code     VARCHAR(20) NOT NULL,
  centre_name     VARCHAR(150) NOT NULL,
  zone_id         INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  state           VARCHAR(100),
  city            VARCHAR(100),
  address         TEXT,
  google_map_link TEXT,
  total_capacity  INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_centre_code UNIQUE (centre_code)
);

-- ── SERVERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servers (
  id          SERIAL PRIMARY KEY,
  server_code VARCHAR(20) NOT NULL,
  centre_id   INTEGER REFERENCES centres(id) ON DELETE SET NULL,
  is_primary  BOOLEAN DEFAULT FALSE,
  capacity    INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_server_code UNIQUE (server_code)
);

-- ── SECTION TIMING (hardcoded — stored for reference) ────────
CREATE TABLE IF NOT EXISTS section_timing (
  id           SERIAL PRIMARY KEY,
  section_code VARCHAR(10) NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  CONSTRAINT unique_section_code UNIQUE (section_code)
);

-- Insert fixed batch timings
INSERT INTO section_timing (section_code, start_time, end_time) VALUES
  ('B1', '09:00:00', '11:30:00'),
  ('B2', '12:30:00', '15:00:00'),
  ('B3', '16:00:00', '18:30:00'),
  ('MOCK', '09:00:00', '17:00:00')
ON CONFLICT (section_code) DO NOTHING;

-- ── SESSION SCHEDULE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_schedule (
  id           SERIAL PRIMARY KEY,
  server_id    INTEGER REFERENCES servers(id) ON DELETE CASCADE,
  exam_date    DATE NOT NULL,
  section_code VARCHAR(10) NOT NULL,
  exam_type    VARCHAR(10) CHECK (exam_type IN ('mock', 'live')) DEFAULT 'live',
  created_at   TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_schedule UNIQUE (server_id, exam_date, section_code)
);

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(150),
  role          VARCHAR(30) CHECK (role IN ('master_admin','zone_admin','server_manager','event_manager','biometric_staff')),
  zone_id       INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  centre_id     INTEGER REFERENCES centres(id) ON DELETE SET NULL,
  server_id     INTEGER REFERENCES servers(id) ON DELETE SET NULL,
  phone         VARCHAR(20),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_username UNIQUE (username)
);

-- ── STAFF ATTENDANCE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_attendance (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  exam_date       DATE NOT NULL,
  exam_type       VARCHAR(10) CHECK (exam_type IN ('mock', 'live')),
  reported_at     TIMESTAMP,
  reported_geo_lat  DECIMAL(10,8),
  reported_geo_lng  DECIMAL(11,8),
  selfie_url      TEXT,
  geo_lat         DECIMAL(10,8),
  geo_lng         DECIMAL(11,8),
  geo_captured_at TIMESTAMP,
  is_submitted    BOOLEAN DEFAULT FALSE,
  submitted_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_staff_attendance UNIQUE (user_id, exam_date)
);

-- ── MOCK CHECKLIST ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_checklist (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER REFERENCES users(id) ON DELETE CASCADE,
  centre_id               INTEGER REFERENCES centres(id) ON DELETE CASCADE,
  exam_date               DATE NOT NULL,
  -- Centre verification
  centre_name_verified    BOOLEAN,
  centre_address_verified BOOLEAN,
  -- Systems
  systems_available       INTEGER,
  systems_tested          INTEGER,
  buffer_systems          INTEGER,
  network_speed           VARCHAR(50),
  system_remarks          TEXT,
  -- Infrastructure
  cctv_available          BOOLEAN,
  cctv_working            BOOLEAN,
  ups_available           BOOLEAN,
  dg_available            BOOLEAN,
  partition_available     BOOLEAN,
  -- Facilities
  drinking_water          BOOLEAN,
  parking_available       BOOLEAN,
  centre_clean            BOOLEAN,
  restrooms_available     BOOLEAN,
  -- Final
  final_remarks           TEXT,
  is_submitted            BOOLEAN DEFAULT FALSE,
  submitted_at            TIMESTAMP,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_mock_checklist UNIQUE (centre_id, exam_date)
);

-- ── MOCK PHOTOS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mock_photos (
  id          SERIAL PRIMARY KEY,
  centre_id   INTEGER REFERENCES centres(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  exam_date   DATE NOT NULL,
  photo_type  VARCHAR(20) CHECK (photo_type IN ('centre','lab1','lab2','cctv','network')),
  photo_url   TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_mock_photo UNIQUE (centre_id, exam_date, photo_type)
);

-- ── LIVE CHECKLIST ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_checklist (
  id                       SERIAL PRIMARY KEY,
  user_id                  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  centre_id                INTEGER REFERENCES centres(id) ON DELETE CASCADE,
  exam_date                DATE NOT NULL,
  security_reached         BOOLEAN,
  security_male_count      INTEGER DEFAULT 0,
  security_female_count    INTEGER DEFAULT 0,
  hhmd_available           BOOLEAN,
  remarks                  TEXT,
  is_submitted             BOOLEAN DEFAULT FALSE,
  submitted_at             TIMESTAMP,
  created_at               TIMESTAMP DEFAULT NOW(),
  updated_at               TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_live_checklist UNIQUE (centre_id, exam_date)
);

-- ── BATCH ATTENDANCE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS batch_attendance (
  id             SERIAL PRIMARY KEY,
  server_id      INTEGER REFERENCES servers(id) ON DELETE CASCADE,
  centre_id      INTEGER REFERENCES centres(id) ON DELETE CASCADE,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  exam_date      DATE NOT NULL,
  section_code   VARCHAR(10) NOT NULL,
  registered     INTEGER DEFAULT 0,
  present        INTEGER DEFAULT 0,
  absent         INTEGER GENERATED ALWAYS AS (registered - present) STORED,
  is_submitted   BOOLEAN DEFAULT FALSE,
  submitted_at   TIMESTAMP,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_batch_attendance UNIQUE (server_id, exam_date, section_code)
);

-- ── ISSUES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id           SERIAL PRIMARY KEY,
  reported_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  centre_id    INTEGER REFERENCES centres(id) ON DELETE SET NULL,
  server_id    INTEGER REFERENCES servers(id) ON DELETE SET NULL,
  exam_date    DATE NOT NULL,
  exam_type    VARCHAR(10) CHECK (exam_type IN ('mock', 'live')),
  section_code VARCHAR(10),
  issue_type   VARCHAR(30) CHECK (issue_type IN ('power','network','system','biometric','candidate','other')),
  severity     VARCHAR(20) CHECK (severity IN ('low','medium','high','critical')),
  app_roll_no  VARCHAR(50),
  description  TEXT,
  status       VARCHAR(20) CHECK (status IN ('open','in_progress','resolved')) DEFAULT 'open',
  resolved_at  TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- ── ISSUE PHOTOS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issue_photos (
  id         SERIAL PRIMARY KEY,
  issue_id   INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  photo_url  TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- ── IMPORT LOG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_log (
  id          SERIAL PRIMARY KEY,
  imported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  filename    VARCHAR(255),
  status      VARCHAR(20) CHECK (status IN ('success','failed','partial')),
  summary     JSONB,
  imported_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
--  INDEXES for performance
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_session_schedule_date     ON session_schedule(exam_date);
CREATE INDEX IF NOT EXISTS idx_session_schedule_server   ON session_schedule(server_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date     ON staff_attendance(exam_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_user     ON staff_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_attendance_date     ON batch_attendance(exam_date);
CREATE INDEX IF NOT EXISTS idx_issues_date               ON issues(exam_date);
CREATE INDEX IF NOT EXISTS idx_issues_centre             ON issues(centre_id);
CREATE INDEX IF NOT EXISTS idx_issues_status             ON issues(status);
