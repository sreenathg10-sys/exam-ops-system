# ExamOps — Monitoring System v2.0

AEEE Entrance Examination Operations Monitoring Tool

## Structure
```
examops/
├── backend/    → Node.js + Express API → deploy on Render
├── frontend/   → React + Tailwind UI  → deploy on Netlify
├── render.yaml → Render config
└── netlify.toml → Netlify config
```

## Quick Start

### 1. Database — Supabase
- Run `backend/config/schema.sql` in Supabase SQL Editor
- Create storage bucket named `examops-media` (set to Public)

### 2. Backend — Render
- Connect this GitHub repo to Render
- Set Root Directory: `backend`
- Build: `npm install` | Start: `node server.js`
- Add environment variables (see backend/.env.example)

### 3. Frontend — Netlify
- Connect this GitHub repo to Netlify
- Build settings auto-detected from `netlify.toml`
- Add env variable: `VITE_API_URL=https://your-render-url.onrender.com/api`

## API Endpoints
```
POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/today-schedule

POST /api/attendance/report
POST /api/attendance/selfie
POST /api/attendance/geo
POST /api/attendance/submit
GET  /api/attendance/centre/:code

POST /api/mock/checklist
POST /api/mock/photos
GET  /api/mock/checklist/:code
GET  /api/mock/photos/:code

POST /api/live/checklist
POST /api/live/batch
GET  /api/live/batch/:code

POST /api/issues
GET  /api/issues/all
GET  /api/issues/centre/:code

GET  /api/dashboard/master
GET  /api/dashboard/zone
GET  /api/dashboard/centre/:code

GET  /api/reports/zone-summary
GET  /api/reports/centre-detail

POST /api/config/import
GET  /api/config/template
GET  /api/config/status
```

## Roles
| Role | Access |
|------|--------|
| master_admin | Pan India dashboard, config upload, reports |
| zone_admin | Zone dashboard, centre drill down |
| server_manager | Attendance, mock/live tabs, report issue |
| event_manager | Attendance, report issue |
| biometric_staff | Attendance, report issue |
