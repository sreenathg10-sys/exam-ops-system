# ExamOps — Deployment Guide

## Step 1 — GitHub

1. Go to github.com → New repository
2. Name: `examops` → Private → Create
3. Open terminal in this folder:
```bash
git init
git add .
git commit -m "initial commit - examops v2.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/examops.git
git push -u origin main
```

---

## Step 2 — Supabase (Database)

1. Go to supabase.com → your project → SQL Editor → New Query
2. Open `backend/config/schema.sql` → copy all → paste → Run
3. Go to Storage → New Bucket → Name: `examops-media` → Public → Create

---

## Step 3 — Render (Backend)

1. Go to render.com → New → Web Service
2. Connect GitHub → select `examops` repo
3. Settings:
   ```
   Name:          examops-backend
   Region:        Singapore
   Root Directory: backend
   Runtime:       Node
   Build Command: npm install
   Start Command: node server.js
   ```
4. Environment Variables — add these:
   ```
   NODE_ENV           = production
   DATABASE_URL       = (from Supabase → Settings → Database → Connection string)
   SUPABASE_URL       = https://xxxxx.supabase.co
   SUPABASE_SERVICE_KEY = (from Supabase → Settings → API → service_role key)
   JWT_SECRET         = examops2026supersecretkey
   STORAGE_BUCKET     = examops-media
   FRONTEND_URL       = https://your-app.netlify.app  (update after Netlify deploy)
   ```
5. Click Create Web Service → wait for green Live ✅
6. Test: https://your-render-url.onrender.com/api/health

---

## Step 4 — Netlify (Frontend)

1. Go to netlify.com → Add new site → Import from Git
2. Connect GitHub → select `examops` repo
3. Build settings (auto from netlify.toml):
   ```
   Base directory:  frontend
   Build command:   npm install && npm run build
   Publish directory: dist
   ```
4. Environment Variables → Add:
   ```
   VITE_API_URL = https://your-render-url.onrender.com/api
   ```
5. Click Deploy → wait for green Published ✅

---

## Step 5 — Update CORS

After Netlify deploys, copy your Netlify URL and:
1. Go to Render → your service → Environment
2. Update `FRONTEND_URL` = `https://your-app.netlify.app`
3. Render will auto-redeploy

---

## Step 6 — Upload Config Data

1. Log in as master_admin (create first user directly in Supabase)
2. Go to Config tab → Download Template
3. Fill in the Excel template (Zones → Centres → Servers → Schedule → Users)
4. Upload the filled Excel
5. All data gets imported ✅

---

## Create First Master Admin

Run this in Supabase SQL Editor (replace password hash or use the import):
```sql
-- Use the Excel import to create users
-- OR create directly:
INSERT INTO users (username, password_hash, full_name, role)
VALUES ('ADMIN', '$2a$10$...bcrypt_hash...', 'Master Admin', 'master_admin');
```

Easiest way: add ADMIN user in the Users sheet of the Excel template and upload it.
