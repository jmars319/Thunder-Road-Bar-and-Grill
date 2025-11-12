# One‑Shot Deployment Checklist (where to run commands)

This single-file checklist groups every runnable command from `DEPLOYMENT_CHECKLIST.md` and shows exactly where to run it:
- `root` = repository root (/Users/.../thunder-road-bar-and-grill-react)
- `frontend` = /frontend
- `backend` = /backend
- `local` = your machine (any cwd) — DB client, `openssl`, Railway CLI when not linked
- `UI` = web UIs (GoDaddy cPanel, Railway dashboard, DNS manager)

Run these steps in order. Commands are copy/paste-ready.

---

## Preflight (local)

Generate secrets and install global tools (run on your local machine):

```bash
# Generate a strong JWT secret (local)
openssl rand -base64 32

# (Optional) Railway CLI (local)
npm i -g @railway/cli

# (Optional) serve for quick static testing (local)
npm i -g serve
```

Notes: Save the JWT_SECRET somewhere secure (password manager).

---

## Repo root

These should be run from the repository root. `railway link` must be run from root to associate the project.

```bash
# (One-time) link Railway to this repo
railway login
railway link  # run from repo root

# Git: keep repo up-to-date and push changes
git pull origin main
git status
git add .
git commit -m "<message>"
git push origin main
```

---

## Backend (/backend)

Change to the backend folder before running these commands:

```bash
cd backend

# Install dependencies (if needed)
npm install

# Lint
npm run lint

# Start server (dev)
npm run dev

# Start server (production/test locally)
npm start

# Optional: remove dev-only packages prior to packaging
npm prune --production

# Run migrations
npx knex migrate:latest --knexfile knexfile.js

# Generate bcrypt hash for admin password (useful for DB updates)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_NEW_SECURE_PASSWORD', 10, (e,h) => console.log(h));"

# Backup uploads folder
tar -czf uploads_backup.tar.gz uploads/
tar -tzf uploads_backup.tar.gz | head -20

# Security audit / updates
npm audit
npm audit fix
npm update
```

Notes: Run `node -e "...bcrypt..."` from `/backend` to ensure `bcrypt` is available as a dependency.

---

## Frontend (/frontend)

Switch to the frontend folder for all frontend npm tasks and build steps:

```bash
cd frontend

# Create or edit production env
# Example: in frontend/.env.production
# REACT_APP_API_BASE=https://your-railway-url.railway.app/api

# Install dependencies (if needed)
npm install

# Lint
npm run lint

# Build (creates frontend/build/)
npm run build

# Quick local test of build (optional)
npx serve -s build

# Create zip of build for fast upload (optional)
cd build
zip -r build.zip ./*
```

Important: If you change `REACT_APP_API_BASE`, rebuild before uploading.

---

## Database client commands (local machine)

Run these where your `mysql` client can reach the target DB (local or remote). CWD doesn't matter.

```bash
# Export schema only
mysqldump -u root -p --no-data thunder_road > schema.sql

# Export full DB
mysqldump -u root -p thunder_road > full_backup.sql

# Export selected tables
mysqldump -u root -p thunder_road users menu_categories menu_items site_settings business_hours navigation footer_columns footer_links about_content media_library job_positions > production_data.sql

# Import into remote DB (Railway example)
mysql -h railway-host -P 3306 -u railway-user -p railway-db < production_data.sql
```

---

## Railway CLI (local machine — run `railway link` from repo root first)

```bash
# Install if not yet installed
npm i -g @railway/cli

# Login and link (run railway link from repo root)
railway login
railway link

# View logs
railway logs

# Run one-off command in Railway environment
railway run "mkdir -p /app/backend/uploads"

# Connect to Railway MySQL (launches connection)
railway connect mysql
```

Notes: run `railway link` from the repo root. After linking, you can run `railway` commands from any cwd, but root is recommended.

---

## Railway UI (use the dashboard web UI)

These are UI tasks (not terminal commands):
- Set service root directory to `backend`
- Set start command to `node server.js`
- Add MySQL service
- Add environment variables (NODE_ENV, FRONTEND_URL, DB_*, JWT_SECRET, etc.)
- Add a persistent volume and mount to `/app/backend/uploads`
- (Optional) Add custom domain (e.g., api.trbgmidway.com) and follow DNS instructions

---

## GoDaddy / cPanel (UI or FTP client)

These steps are done in cPanel or your FTP client (FileZilla, Cyberduck):
- Upload the contents of `frontend/build/` to `public_html/`
  - Via cPanel File Manager: upload files or upload `build.zip` and extract
  - Or via FTP: upload files to `public_html/`
- Create/edit `.htaccess` in `public_html/` for SPA routing and security headers
- Enable AutoSSL in cPanel → Security → SSL/TLS Status
- Manage DNS records in GoDaddy DNS UI for `api.` subdomain if needed

`.htaccess` content (example) — create in `public_html/` on the server (or place in `frontend/public/.htaccess` so it is included in build):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set Referrer-Policy "no-referrer"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

---

## Post-deploy verification (local)

Run these from your local machine (cwd not important):

```bash
# Test backend health and endpoints
curl https://<your-railway-url>/api/health
curl https://<your-railway-url>/api/site-settings
curl https://<your-railway-url>/api/menu

# Test frontend
curl -I https://trbgmidway.com

# Rate-limit test (login attempts)
for i in {1..10}; do
  curl -X POST https://<your-railway-url>/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"wrong"}'
done
```

---

## Backup & maintenance (local / repo)

Suggested locations for scripts: create them in the repo root (e.g., `backup-railway-db.sh`). Run locally or schedule via `cron` on a backup server.

Example backup script (save as `backup-railway-db.sh` in repo root and make executable):

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups/trbgmidway"
mkdir -p $BACKUP_DIR
RAILWAY_HOST="containers-us-west-xxx.railway.app"
RAILWAY_PORT="3306"
RAILWAY_USER="root"
RAILWAY_PASS="your-password-from-railway"
RAILWAY_DB="railway"

mysqldump -h $RAILWAY_HOST -P $RAILWAY_PORT -u $RAILWAY_USER -p$RAILWAY_PASS $RAILWAY_DB > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
echo "Backup completed: backup_$DATE.sql.gz"
```

Run it locally:

```bash
chmod +x backup-railway-db.sh
./backup-railway-db.sh
```

---

## Quick one‑shot order (recommended minimal sequence)

1. Repo root:
```bash
git pull origin main
```
2. Local: generate secret
```bash
openssl rand -base64 32
```
3. Backend (local checks & migrations):
```bash
cd backend
npm install
npm run lint
npx knex migrate:latest --knexfile knexfile.js
```
4. Frontend (build):
```bash
cd ../frontend
npm install
# set frontend/.env.production -> REACT_APP_API_BASE=https://<railway-url>/api
npm run build
```
5. Upload frontend/build/* to GoDaddy `public_html/` (use cPanel or FTP) — UI step
6. Railway UI: add MySQL, set env vars (FRONTEND_URL, DB_*, JWT_SECRET), mount uploads volume — UI steps
7. Import DB (local):
```bash
mysql -h <railway-host> -u <railway-user> -p <railway-db> < production_data.sql
```
8. Verify endpoints (local):
```bash
curl https://<railway-url>/api/health
curl https://trbgmidway.com
```

---

## Final notes
- Always run `railway link` from repo root.
- When editing anything that should be part of the build (like `.htaccess`), add it into `frontend/public/` before running `npm run build`.
- Do not commit `.env` files. Use Railway UI for backend envs and create a local `frontend/.env.production` before building.

If you want, I can:
- commit this file and push it to `origin/main` (I can do that now), or
- create helper scripts (`build-frontend.sh`, `lint-all.sh`, `backup-db.sh`) in the repo root and test them locally.
