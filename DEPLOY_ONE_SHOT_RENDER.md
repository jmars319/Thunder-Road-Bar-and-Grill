# Thunder Road Bar & Grill - ONE-SHOT DEPLOYMENT CHECKLIST (RENDER)

**Quick Reference:** Command-by-command deployment guide  
**Platform:** Render.com (FREE) + GoDaddy Deluxe  
**Total Time:** ~30 minutes  
**Total Cost:** $8/month ($8 GoDaddy + $0 Render)

---

## 📍 Command Execution Guide

### Legend:
- `💻 LOCAL MACHINE` - Run from anywhere on your computer
- `📁 REPO ROOT` - Run from `/Users/jason_marshall/Documents/Website Projects/Current/thunder-road-bar-and-grill-react`
- `🔙 BACKEND` - Run from `/Users/jason_marshall/Documents/Website Projects/Current/thunder-road-bar-and-grill-react/backend`
- `🎨 FRONTEND` - Run from `/Users/jason_marshall/Documents/Website Projects/Current/thunder-road-bar-and-grill-react/frontend`
- `🌐 RENDER DASHBOARD` - Use web browser at render.com
- `🌐 GODADDY cPANEL` - Use web browser at godaddy.com

---

## Phase 1: Preflight Checks (💻 LOCAL MACHINE)

```bash
# Generate JWT secret
openssl rand -base64 32
# SAVE THIS OUTPUT - you'll need it for Render environment variables

# Generate bcrypt password hash for admin user
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_NEW_ADMIN_PASSWORD', 10, (e,h) => console.log(h));"
# SAVE THIS HASH - you'll need it to update admin password
```

---

## Phase 2: Repository Preparation (📁 REPO ROOT)

```bash
# Navigate to repo
cd /Users/jason_marshall/Documents/Website\ Projects/Current/thunder-road-bar-and-grill-react

# Check git status
git status

# Commit any pending changes
git add .
git commit -m "Prepare for Render deployment"

# Push to GitHub (triggers auto-deploy on Render)
git push origin main

# Verify render.yaml exists
cat render.yaml
```

---

## Phase 3: Backend Database Setup (🔙 BACKEND)

```bash
# Navigate to backend
cd backend

# Export current MySQL database structure
mysqldump -u root -p --no-data thunder_road > schema.sql

# Export full database with data
mysqldump -u root -p thunder_road > full_backup.sql

# Export specific tables (recommended)
mysqldump -u root -p thunder_road \
  users \
  menu_categories \
  menu_items \
  site_settings \
  business_hours \
  navigation \
  footer_columns \
  footer_links \
  about_content \
  media_library \
  job_positions \
  > production_data.sql

# Backup uploads folder
tar -czf uploads_backup.tar.gz uploads/

# Verify backup
tar -tzf uploads_backup.tar.gz | head -20
```

### Convert MySQL to PostgreSQL (if needed)

```bash
# Option 1: Install pgloader (macOS)
brew install pgloader

# Option 2: Manual conversion with sed
# Replace MySQL-specific syntax:
sed -i '' 's/AUTO_INCREMENT/SERIAL/g' schema.sql
sed -i '' 's/TINYINT(1)/BOOLEAN/g' schema.sql
sed -i '' 's/DATETIME/TIMESTAMP/g' schema.sql
sed -i '' '/ENGINE=InnoDB/d' schema.sql
```

---

## Phase 4: Render Service Creation (🌐 RENDER DASHBOARD)

### Blueprint Deployment (Recommended - One Click)

1. Go to [render.com](https://render.com) → Sign up/Login with GitHub
2. Click "New +" → "Blueprint"
3. Select repository: `jmars319/thunder-road-bar-and-grill-react`
4. Render detects `render.yaml` and shows preview
5. Update environment variables in blueprint:
   - `JWT_SECRET`: Paste your generated secret from Phase 1
6. Click "Apply"
7. Wait for deploy (3-5 minutes)
8. Note your service URL: `https://thunder-road-backend.onrender.com`

### Manual Setup (Alternative)

#### Create PostgreSQL Database
1. New + → PostgreSQL
2. Name: `thunder-road-db`
3. Database: `thunder_road`
4. Region: Oregon
5. Plan: Free
6. Create Database
7. Copy "External Database URL" from Info tab

#### Create Web Service
1. New + → Web Service
2. Connect GitHub: `jmars319/thunder-road-bar-and-grill-react`
3. Configure:
   - Name: `thunder-road-backend`
   - Region: Oregon
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Plan: Free
4. Add Environment Variables (see Phase 5)
5. Create Web Service

---

## Phase 5: Environment Variables (🌐 RENDER DASHBOARD)

In your web service → Environment tab, add:

```bash
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://trbgmidway.com,https://www.trbgmidway.com
TRUST_PROXY=true
FORCE_HTTPS=true
DATABASE_URL=${{thunder-road-db.DATABASE_URL}}
DB_CONN_LIMIT=10
JWT_SECRET=<YOUR_GENERATED_SECRET_FROM_PHASE_1>
JWT_EXPIRY=24h
ALLOW_DEV_ADMIN_HEADER=0
LOG_LEVEL=info
```

**Save Changes** (Render auto-redeploys)

---

## Phase 6: Configure Persistent Disk (🌐 RENDER DASHBOARD)

1. Your web service → Disks tab
2. Add Disk:
   - Name: `uploads`
   - Mount Path: `/opt/render/project/src/backend/uploads`
   - Size: 1 GB
3. Save (Render redeploys)

---

## Phase 7: Import Database (💻 LOCAL MACHINE)

```bash
# Get Render PostgreSQL connection string from dashboard
# Format: postgresql://user:pass@host:5432/dbname

# Import schema (if converted to PostgreSQL)
psql <render-connection-string> < schema_postgres.sql

# OR import full data
psql <render-connection-string> < production_data_postgres.sql

# OR use pgloader for live migration
cat > migrate.load << 'EOF'
LOAD DATABASE
  FROM mysql://root:password@localhost/thunder_road
  INTO <render-connection-string>
  
  WITH include drop, create tables, create indexes, reset sequences
  
  CAST type datetime to timestamp
       drop default drop not null using zero-dates-to-null,
       type date drop not null drop default using zero-dates-to-null;
EOF

pgloader migrate.load
```

---

## Phase 8: Update Admin Password (💻 LOCAL MACHINE)

```bash
# Connect to Render PostgreSQL
psql <render-connection-string>

# Update admin password with your hash from Phase 1
UPDATE users SET password_hash = '<YOUR_GENERATED_HASH_FROM_PHASE_1>' WHERE username = 'admin';

# Verify
SELECT username, is_active FROM users WHERE role = 'admin';

# Exit
\q
```

---

## Phase 9: Test Backend API (💻 LOCAL MACHINE)

```bash
# Test health endpoint (may take 20-30s on first request if idle)
curl https://thunder-road-backend.onrender.com/api/health
# Expected: {"status":"ok","timestamp":"..."}

# Test site settings
curl https://thunder-road-backend.onrender.com/api/site-settings

# Test menu
curl https://thunder-road-backend.onrender.com/api/menu

# Test business hours
curl https://thunder-road-backend.onrender.com/api/business-hours
```

---

## Phase 10: Frontend Build (🎨 FRONTEND)

```bash
# Navigate to frontend
cd frontend

# Create production environment file
cat > .env.production << 'EOF'
REACT_APP_API_BASE=https://thunder-road-backend.onrender.com/api
EOF

# Install dependencies (if needed)
npm install

# Run linter
npm run lint

# Build for production
npm run build

# Verify build
ls -la build/
# Should see: index.html, static/, asset-manifest.json, etc.

# Test build locally (optional)
npx serve -s build
# Visit http://localhost:3000
# Ctrl+C to stop
```

---

## Phase 11: GoDaddy Upload (🌐 GODADDY cPANEL)

### Via File Manager (Easiest)

1. Login to GoDaddy → My Products → Hosting → Manage → cPanel
2. Click "File Manager"
3. Navigate to `public_html/`
4. **DELETE OLD FILES** (except `.htaccess` if exists)
5. Upload ALL files from `frontend/build/`:
   - `index.html`
   - `asset-manifest.json`
   - `favicon.ico`
   - `manifest.json`
   - `robots.txt`
   - `sitemap.xml`
   - Entire `static/` folder
6. Wait for upload to complete
7. Set permissions (if needed): 644 for files, 755 for folders

### Via FTP (Alternative - 🔙 BACKEND)

```bash
# Navigate to frontend build
cd frontend/build

# Upload via FTP
ftp ftp.yourdomain.com
# Username: your_godaddy_ftp_username
# Password: your_godaddy_ftp_password

# Once connected:
cd public_html
mput *

# Or use SFTP/FileZilla for GUI upload
```

---

## Phase 12: SSL & Domain Configuration (🌐 GODADDY cPANEL)

### Enable SSL (Free)
1. GoDaddy cPanel → Security → SSL/TLS Status
2. Select your domain: `trbgmidway.com`
3. Click "Run AutoSSL"
4. Wait 5-10 minutes
5. Verify: Visit `https://trbgmiddy.com` (should show padlock)

### Force HTTPS
1. cPanel → File Manager → `public_html/`
2. Edit `.htaccess` (or create if doesn't exist)
3. Add:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   
   # Also redirect www to non-www
   RewriteCond %{HTTP_HOST} ^www\.(.*)$ [NC]
   RewriteRule ^(.*)$ https://%1/$1 [R=301,L]
   ```
4. Save

### Update Render FRONTEND_URL
1. Render Dashboard → Your web service → Environment
2. Update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://trbgmidway.com,https://www.trbgmidway.com
   ```
3. Save (Render auto-redeploys)

---

## Phase 13: Post-Deployment Testing (💻 LOCAL MACHINE)

```bash
# Test frontend loads
curl -I https://trbgmidway.com
# Expected: HTTP/2 200

# Test API connection from frontend
# Visit in browser: https://trbgmiddy.com
# Open DevTools → Network tab
# Should see API calls to: https://thunder-road-backend.onrender.com/api/...

# Test admin login
# Visit: https://trbgmiddy.com/admin
# Login with your new credentials

# Test file upload (via admin panel)
# Upload an image to media library
# Verify it persists after Render redeploy

# Test forms
# - Job application (with resume)
# - Reservations
# - Contact form
# - Newsletter signup
```

---

## Phase 14: Monitoring Setup (🌐 RENDER DASHBOARD)

### View Logs
1. Render → Your web service → Logs tab
2. Monitor real-time logs
3. Filter by: Deploy Logs, Runtime Logs

### Setup Backup Script (💻 LOCAL MACHINE)

```bash
# Create backup script
cat > backup-render-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups/trbgmidway"
mkdir -p $BACKUP_DIR

# Replace with your Render connection string
RENDER_DB_URL="postgresql://user:pass@host:5432/dbname"

pg_dump $RENDER_DB_URL > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x backup-render-db.sh

# Test backup
./backup-render-db.sh

# Setup automated daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /path/to/backup-render-db.sh
```

---

## 🎯 Quick Command Summary by Location

| Location | Commands |
|----------|----------|
| **💻 LOCAL** | `openssl rand -base64 32`, `node -e "bcrypt..."`, `curl` tests |
| **📁 REPO ROOT** | `git status`, `git add .`, `git commit`, `git push`, `cat render.yaml` |
| **🔙 BACKEND** | `mysqldump`, `tar -czf uploads_backup.tar.gz`, `sed` conversions |
| **🎨 FRONTEND** | `npm run lint`, `npm run build`, `npx serve -s build` |
| **💻 DB CLIENT** | `psql <url>`, `pg_dump <url>`, `pgloader migrate.load` |
| **🌐 RENDER** | Dashboard operations (no CLI required) |
| **🌐 GODADDY** | File Manager uploads, `.htaccess` edits, SSL setup |

---

## 🆘 Common Issues & Quick Fixes

### Issue: Render service won't start
```bash
# Check Render Logs (dashboard → Logs tab)
# Verify environment variables are set
# Ensure PORT is 10000 or process.env.PORT
```

### Issue: Database connection failed
```bash
# Verify DATABASE_URL format:
# postgresql://user:pass@host:5432/dbname

# Check knexfile.js includes SSL config:
# ssl: { rejectUnauthorized: false }
```

### Issue: Slow first request (free tier)
```bash
# Normal behavior - service spins down after 15 min idle
# First request takes 20-30 seconds to wake up
# Solution: Upgrade to Starter ($7/month) or use ping service
```

### Issue: PostgreSQL database expired
```bash
# Free databases expire after 90 days
# Render emails you before expiration
# Dashboard → Database → Settings → "Extend" button
# Or upgrade to paid database ($7/month)
```

### Issue: CORS errors on frontend
```bash
# Verify FRONTEND_URL in Render matches your GoDaddy domain
# Must include both www and non-www variants
# Example: https://trbgmidway.com,https://www.trbgmiddy.com
```

---

## 💰 Cost Tracking

| Service | Cost | What You Get |
|---------|------|--------------|
| GoDaddy Deluxe | $8/month | Frontend hosting, SSL, email, 10 sites |
| Render Free Tier | **$0/month** | Backend + PostgreSQL + 1GB disk + SSL |
| **Total** | **$8/month** | Professional full-stack hosting |

**Upgrade Options:**
- Render Starter: +$7/month (no spin-down)
- Render Database: +$7/month (permanent, no 90-day limit)
- Total if upgraded: $22/month

---

## 🚀 Future Migration to Railway

When client approves budget:

```bash
# Export from Render
pg_dump <render-url> > render_final_backup.sql

# Import to Railway
# Follow Railway deployment guide
# Update REACT_APP_API_BASE
# Rebuild frontend
# Upload to GoDaddy

# Railway cost: +$5/month = $13/month total
```

---

*One-Shot Checklist for Render Deployment*  
*Created: November 14, 2025*  
*Thunder Road Bar & Grill React Application*  
*Estimated Time: 30 minutes | Cost: $8/month*
