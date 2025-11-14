# Thunder Road Bar & Grill - Hybrid Deployment Guide (Render)

**Deployment Strategy:** Hybrid Approach (Cost-Effective)  
**Frontend:** GoDaddy Deluxe Hosting  
**Backend + Database:** Render.com  
**Date Prepared:** November 14, 2025  
**Total Monthly Cost:** ~$8/month ($8 GoDaddy + **$0 Render Free Tier**)

---

## 🎯 Deployment Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Users → GoDaddy (React Frontend) → Render (Node.js API)   │
│                                          ↓                  │
│                                    Render PostgreSQL        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why This Approach with Render?**
- ✅ **FREE** for backend + database (Render Free Tier)
- ✅ Uses your existing GoDaddy Deluxe plan (no waste)
- ✅ Professional Node.js hosting
- ✅ Managed PostgreSQL database included (free tier)
- ✅ Automatic deployments from GitHub
- ✅ Built-in SSL on both platforms
- ✅ Persistent disk storage for uploads (1GB free)
- ✅ Simple setup (30 minutes total)
- ✅ Easy migration to paid tier when ready (~$7/month)

**Render Free Tier Limitations:**
- Services spin down after 15 minutes of inactivity (first request takes ~30 seconds)
- 750 hours/month free (sufficient for one service)
- PostgreSQL: 90-day expiration (must extend every 90 days)
- 1GB persistent disk storage
- Upgrade to paid tier removes all limitations

---

## 📋 Pre-Deployment Checklist

> 📄 **See DEPLOYMENT_FILES.md** for a complete breakdown of which files to deploy and which to keep in development.

### Phase 1: Local Preparation (Complete These BEFORE Deployment)

#### 1.1 Security Configuration ✅

- [ ] **Generate Strong JWT Secret**
  ```bash
  # Run this command to generate a secure secret:
  openssl rand -base64 32
  
  # Save the output - you'll need it for production .env
  ```

- [ ] **Change Default Admin Password**
  ```bash
  # Connect to your local database
  mysql -u root -p thunder_road
  
  # Generate a new bcrypt hash for your password
  # Use this Node.js command:
  node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_NEW_SECURE_PASSWORD', 10, (e,h) => console.log(h));"
  
  # Update the admin user:
  UPDATE users SET password_hash = 'YOUR_GENERATED_HASH' WHERE username = 'admin';
  ```

- [ ] **Review and Update Site Settings**
  - Update business name, tagline, contact info
  - Set proper phone numbers and email addresses
  - Configure social media links
  - Upload final logo and hero images

- [ ] **Test All Forms Locally**
  - [ ] Job applications (with and without resume)
  - [ ] Reservations
  - [ ] Contact form
  - [ ] Newsletter signup
  - [ ] Admin login
  - [ ] All admin CRUD operations

#### 1.2 Code Preparation ✅

- [ ] **Update API Base URLs**
  ```bash
  # Frontend - update .env or .env.production
  # Create: frontend/.env.production
  REACT_APP_API_BASE=https://thunder-road-backend.onrender.com/api
  
  # Render provides a URL like: your-service-name.onrender.com
  ```

- [ ] **Build Frontend for Production**
  ```bash
  cd frontend
  npm run build
  
  # This creates an optimized build in frontend/build/
  # Verify no errors in build output
  ```

- [ ] **Run Linters**
  ```bash
  # Backend
  cd backend
  npm run lint
  
  # Frontend
  cd frontend
  npm run lint
  ```

#### 1.3 Database Preparation ✅

**Important:** Render uses PostgreSQL (not MySQL). You'll need to:
1. Convert your MySQL schema to PostgreSQL
2. OR use a MySQL-compatible PostgreSQL database

- [ ] **Export Database Schema**
  ```bash
  # Export structure only (for initial setup)
  mysqldump -u root -p --no-data thunder_road > schema.sql
  
  # Export full database (structure + data)
  mysqldump -u root -p thunder_road > full_backup.sql
  
  # Export with specific tables (recommended approach)
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
  ```

- [ ] **Convert MySQL to PostgreSQL** (if needed)
  ```bash
  # Option 1: Use pgloader (recommended)
  brew install pgloader  # macOS
  # Then follow Render's migration guide
  
  # Option 2: Manual conversion
  # Replace MySQL-specific syntax with PostgreSQL equivalents
  # - AUTO_INCREMENT → SERIAL
  # - TINYINT → SMALLINT or BOOLEAN
  # - DATETIME → TIMESTAMP
  # - ENGINE=InnoDB → (remove)
  ```

- [ ] **Backup Uploads Folder**
  ```bash
  # Create archive of all uploaded media
  cd backend
  tar -czf uploads_backup.tar.gz uploads/
  
  # Verify archive
  tar -tzf uploads_backup.tar.gz | head -20
  ```

---

## 🚀 Render Backend Deployment (Phase 2)

> 📄 **Reference DEPLOYMENT_FILES.md** for the exact list of backend files to deploy to Render.

### Phase 2: Deploy Backend + Database to Render

#### 2.1 Create Render Account

- [ ] Go to [render.com](https://render.com)
- [ ] Click "Get Started for Free"
- [ ] Sign up with GitHub (recommended for easy deployments)
- [ ] Verify your email

#### 2.2 Deploy Using Blueprint (Recommended - One Click)

**Using the provided `render.yaml` file:**

- [ ] In Render Dashboard, click "New +"
- [ ] Select "Blueprint"
- [ ] Connect to GitHub repository: `jmars319/thunder-road-bar-and-grill-react`
- [ ] Render will detect `render.yaml` and create:
  - Backend web service
  - PostgreSQL database
  - Persistent disk for uploads
  - All environment variables
- [ ] Click "Apply" to deploy everything at once
- [ ] Wait for initial build (3-5 minutes)

**Manual Setup (Alternative):**

#### 2.3 Create PostgreSQL Database (Manual Setup)

- [ ] In Render Dashboard, click "New +"
- [ ] Select "PostgreSQL"
- [ ] Configure database:
  - **Name:** `thunder-road-db`
  - **Database:** `thunder_road`
  - **Region:** Oregon (or closest to you)
  - **Plan:** Free
- [ ] Click "Create Database"
- [ ] Note down connection details (available in "Info" tab):
  - Internal Database URL
  - External Database URL
  - PSQL Command

#### 2.4 Create Web Service (Manual Setup)

- [ ] In Render Dashboard, click "New +"
- [ ] Select "Web Service"
- [ ] Connect to GitHub repository: `jmars319/thunder-road-bar-and-grill-react`
- [ ] Configure service:
  - **Name:** `thunder-road-backend`
  - **Region:** Oregon (same as database)
  - **Branch:** `main`
  - **Root Directory:** `backend`
  - **Runtime:** Node
  - **Build Command:** `npm install`
  - **Start Command:** `node server.js`
  - **Plan:** Free

#### 2.5 Configure Environment Variables

- [ ] In your web service, go to "Environment" tab
- [ ] Add these environment variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=10000  # Render uses port 10000

# Frontend URL (your GoDaddy domain)
FRONTEND_URL=https://trbgmidway.com,https://www.trbgmidway.com

# Trust proxy (Render uses proxies)
TRUST_PROXY=true
FORCE_HTTPS=true

# Database (use Render's PostgreSQL connection)
DATABASE_URL=${{thunder-road-db.DATABASE_URL}}
# OR manually set:
# DB_HOST=<from Render DB Info>
# DB_PORT=5432
# DB_USER=<from Render DB Info>
# DB_PASSWORD=<from Render DB Info>
# DB_NAME=thunder_road
DB_CONN_LIMIT=10

# Authentication - PASTE YOUR GENERATED SECRET HERE
JWT_SECRET=YOUR_GENERATED_32_CHAR_SECRET_FROM_PHASE_1
JWT_EXPIRY=24h

# Security
ALLOW_DEV_ADMIN_HEADER=0
LOG_LEVEL=info
```

**💡 Render Variable Syntax:**
- Render auto-sets `PORT` to 10000
- Use `${{service-name.VARIABLE}}` to reference other services
- Database URL format: `postgresql://user:pass@host:5432/dbname`

#### 2.6 Configure Persistent Disk for Uploads

- [ ] In your web service, go to "Disks" tab
- [ ] Click "Add Disk"
- [ ] Configure:
  - **Name:** `uploads`
  - **Mount Path:** `/opt/render/project/src/backend/uploads`
  - **Size:** 1 GB (free tier)
- [ ] Click "Save"

**This ensures uploaded media persists across deployments!**

#### 2.7 Add Health Check Path

- [ ] In your web service, go to "Settings" tab
- [ ] Scroll to "Health Check Path"
- [ ] Set to: `/api/health`
- [ ] Save changes

#### 2.8 Import Database

Render PostgreSQL provides multiple import options:

**Option A: Via Render Shell (Easiest for PostgreSQL)**
- [ ] In Render, go to your PostgreSQL database
- [ ] Click "Connect" → "External Connection"
- [ ] Copy the PSQL command
- [ ] From your local machine:
  ```bash
  # Connect to Render PostgreSQL
  psql <connection-string-from-render>
  
  # Import schema (if converted to PostgreSQL format)
  \i /path/to/schema_postgres.sql
  
  # Or import data
  \i /path/to/production_data_postgres.sql
  ```

**Option B: Use pgloader for MySQL → PostgreSQL Migration**
```bash
# Install pgloader
brew install pgloader  # macOS
# or follow https://pgloader.io/

# Create pgloader command file: migrate.load
cat > migrate.load << 'EOF'
LOAD DATABASE
  FROM mysql://root:password@localhost/thunder_road
  INTO postgresql://<render-connection-string>
  
  WITH include drop, create tables, create indexes, reset sequences
  
  CAST type datetime to timestamp
       drop default drop not null using zero-dates-to-null,
       type date drop not null drop default using zero-dates-to-null;
EOF

# Run migration
pgloader migrate.load
```

**Option C: Manual SQL Import with psql**
```bash
# Get your external database URL from Render
RENDER_DB_URL="postgresql://user:pass@host/dbname"

# Import converted SQL
psql $RENDER_DB_URL < production_data_postgres.sql
```

#### 2.9 Run Database Migrations (If Using Knex with PostgreSQL)

**Update `knexfile.js` for PostgreSQL:**

```javascript
// backend/knexfile.js
module.exports = {
  production: {
    client: 'pg',  // Changed from 'mysql2'
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }  // Required for Render
    },
    pool: {
      min: 2,
      max: parseInt(process.env.DB_CONN_LIMIT) || 10
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    }
  }
};
```

Then run migrations:
- [ ] In Render web service, go to "Shell" tab
- [ ] Click "Launch Shell"
- [ ] Run:
  ```bash
  cd backend
  npx knex migrate:latest --knexfile knexfile.js --env production
  ```

#### 2.10 Update Admin Password in Render Database

```bash
# From your local machine, connect to Render PostgreSQL
psql <render-external-connection-string>

# Update admin password with your generated hash
UPDATE users SET password_hash = 'YOUR_GENERATED_BCRYPT_HASH' WHERE username = 'admin';

# Verify
SELECT username, is_active FROM users WHERE role = 'admin';
\q
```

#### 2.11 Upload Existing Media Files

**Option A: Via Render Shell**
```bash
# In Render Dashboard → Your web service → Shell
cd /opt/render/project/src/backend/uploads
# Then manually upload files via sftp or use the Shell to download from a URL
```

**Option B: Re-upload via Admin Panel**
- After deployment, use your admin panel to re-upload images
- This is often simpler for smaller media libraries

**Option C: Use Render Disk Upload**
- Some Render features may allow direct disk uploads
- Check Render documentation for latest disk management features

#### 2.12 Get Your Render Backend URL

- [ ] In Render dashboard, click your web service
- [ ] Your service URL is displayed at the top (copy it):
  ```
  https://thunder-road-backend.onrender.com
  ```
- [ ] **SAVE THIS URL** - you'll need it for frontend configuration
- [ ] (Optional) Add custom domain in "Settings" → "Custom Domain"

#### 2.13 Test Render Backend

```bash
# Test the Render URL (use YOUR actual Render URL)
curl https://thunder-road-backend.onrender.com/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# Test site settings
curl https://thunder-road-backend.onrender.com/api/site-settings

# Test menu
curl https://thunder-road-backend.onrender.com/api/menu
```

**Note:** First request may take 20-30 seconds if service was idle (free tier spins down).

---

## 🌐 GoDaddy Frontend Deployment (Phase 3)

> 📄 **Reference DEPLOYMENT_FILES.md** for the exact list of frontend build files to upload to GoDaddy.

### Phase 3: Deploy React Frontend to GoDaddy Deluxe

#### 3.1 Prepare Frontend Build

**On your local machine:**
```bash
cd frontend

# Create production environment file
nano .env.production

# Add your Render backend URL:
REACT_APP_API_BASE=https://thunder-road-backend.onrender.com/api
# ⚠️ REPLACE with YOUR actual Render URL from Phase 2.12
# ⚠️ Include /api at the end
# ⚠️ NO trailing slash

# Build for production
npm run build

# Verify build folder
ls -la build/
# Should see: index.html, static/, etc.

# Test the build locally (optional)
npx serve -s build
# Visit http://localhost:3000 to verify it works
```

#### 3.2 Access GoDaddy cPanel

- [ ] Log into your GoDaddy account at [godaddy.com](https://godaddy.com)
- [ ] Go to "My Products"
- [ ] Find your Deluxe Hosting plan
- [ ] Click "Manage" → "cPanel Admin"

#### 3.3 Upload Frontend Build

**Follow the same steps as the original guide** - upload contents of `frontend/build/` to `public_html/`

[Same as original guide - sections 3.3-3.6 unchanged]

---

## 🔐 SSL & Domain Configuration (Phase 4)

[Same as original guide - SSL and domain configuration steps unchanged]

#### 4.3 Update Render FRONTEND_URL

Now that your GoDaddy site is live:

- [ ] Go to Render dashboard
- [ ] Click your web service
- [ ] Go to "Environment" tab
- [ ] Update `FRONTEND_URL`:
  ```
  FRONTEND_URL=https://trbgmidway.com,https://www.trbgmidway.com
  ```
- [ ] Save changes (Render will auto-redeploy)

**💡 Why this matters:** CORS security requires exact domain matches

#### 4.4 Configure Render Custom Domain (Optional)

If you want a custom subdomain like `api.trbgmidway.com`:

- [ ] In Render, go to your web service
- [ ] Click "Settings" → "Custom Domain"
- [ ] Click "Add Custom Domain"
- [ ] Enter: `api.trbgmidway.com`
- [ ] Render provides CNAME instructions
- [ ] In GoDaddy DNS Management:
  - Type: CNAME
  - Name: api
  - Value: (provided by Render, e.g., `thunder-road-backend.onrender.com`)
  - TTL: 1 Hour
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Render automatically provisions SSL
- [ ] Update frontend `.env.production`:
  ```
  REACT_APP_API_BASE=https://api.trbgmidway.com/api
  ```
- [ ] Rebuild and redeploy frontend

---

## 🔍 Post-Deployment Testing (Phase 5)

### Phase 5: Comprehensive Testing

#### 5.1 Test Render Backend API

```bash
# Health check (use YOUR Render URL)
curl https://thunder-road-backend.onrender.com/api/health

# Expected: {"status":"ok","timestamp":"..."}
# Note: First request may take 20-30 seconds (free tier wake-up)

# Site settings (public)
curl https://thunder-road-backend.onrender.com/api/site-settings

# Menu (public)
curl https://thunder-road-backend.onrender.com/api/menu

# Business hours
curl https://thunder-road-backend.onrender.com/api/business-hours
```

[Rest of testing sections follow the same pattern, just replace Railway URLs with Render URLs]

---

## 📊 Monitoring and Maintenance (Phase 6)

### Phase 6: Setup Monitoring & Backups

#### 6.1 Render Logs Monitoring

**View Real-Time Logs:**
- [ ] In Render dashboard, click your web service
- [ ] Click "Logs" tab
- [ ] Logs update in real-time
- [ ] Filter by: All Logs, Deploy Logs, or Runtime Logs

**Via Render CLI (Optional):**
```bash
# Install Render CLI
npm i -g render-cli

# Login
render login

# View logs
render logs <service-id>
```

**Set Up Log Alerts:**
- Render Pro plan includes log streaming to external services
- Free tier: monitor via dashboard

#### 6.2 Database Backups

**Render PostgreSQL Backups:**
- Free tier: Manual backups only
- Paid tiers: Automatic daily backups with point-in-time recovery
- Access via Render dashboard → Database → Backups

**Manual Backup Script (Run Locally):**
```bash
#!/bin/bash
# save as: backup-render-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups/trbgmidway"

mkdir -p $BACKUP_DIR

# Get Render PostgreSQL connection string from Render dashboard
# Format: postgresql://user:pass@host:5432/dbname
RENDER_DB_URL="postgresql://user:pass@host:5432/dbname"

# Backup using pg_dump
pg_dump $RENDER_DB_URL > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**Set up automated backups:**
```bash
# Make script executable
chmod +x backup-render-db.sh

# Add to crontab (runs daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup-render-db.sh
```

**Important Note for Free Tier:**
- PostgreSQL databases on free tier expire after 90 days
- Render will email you before expiration
- You can extend for another 90 days with one click
- Or upgrade to paid tier for permanent databases

---

## 🔐 Security Hardening Checklist (Phase 7)

[Similar security steps, adjusted for Render]

---

## 💰 Cost Breakdown

| Service | Plan | Monthly Cost | What's Included |
|---------|------|--------------|-----------------|
| **GoDaddy Deluxe** | Deluxe Hosting | ~$8/month | Frontend hosting, 10 websites, 50GB storage, SSL, email |
| **Render** | Free Tier | **$0/month** | Backend hosting, PostgreSQL database, 1GB disk, SSL, auto-deploy |
| **Total** | | **$8/month** | Full-stack professional hosting |

**Render Upgrade Path:**
- Starter: $7/month (no spin-down, 512 MB RAM)
- Standard: $25/month (1 GB RAM, better performance)
- Pro: $85/month (4 GB RAM, advanced features)
- Database: $7/month (persistent, no expiration)

**Compared to Alternatives:**
- Railway: $5/month minimum
- Heroku: $7/month minimum
- VPS Hosting: $20-50/month + management time
- Your Current Setup: **$8/month total (saves $5/month vs Railway)**

---

## 🎯 Quick Reference Commands

### Render CLI
```bash
# Install (optional)
npm i -g render-cli

# Login
render login

# List services
render services

# View logs
render logs <service-id>

# Open service in browser
render open <service-id>
```

### Database Commands (PostgreSQL)
```bash
# Export database
pg_dump <render-connection-url> > backup.sql

# Import database
psql <render-connection-url> < backup.sql

# Connect to database
psql <render-connection-url>
```

### Git Commands
```bash
git status                 # Check changes
git add .                  # Stage all changes
git commit -m "message"    # Commit changes
git push                   # Push to GitHub (triggers Render deploy)
git log --oneline          # View commit history
git revert HEAD            # Undo last commit
```

---

## 🆘 Troubleshooting Common Issues

### Issue: Render Service Won't Start

**Check Render Logs:**
- [ ] Go to Render → Your web service → Logs
- [ ] Look for error messages during build or runtime

**Common Issues:**

1. **Port Mismatch**
   ```
   Error: EADDRINUSE or "port already in use"
   Solution: Ensure your server.js uses process.env.PORT
   const PORT = process.env.PORT || 5001;
   ```

2. **Missing Environment Variables**
   ```
   Solution: Check Environment tab
   - Verify JWT_SECRET is set
   - Verify DATABASE_URL or DB_* variables are set
   - Check FRONTEND_URL is correct
   ```

3. **PostgreSQL Connection Failed**
   ```
   Solution: 
   - Verify DATABASE_URL format: postgresql://user:pass@host:5432/dbname
   - Check SSL configuration in knexfile.js
   - Ensure database exists and is running
   ```

### Issue: Slow First Request (Free Tier)

**This is normal for Render free tier:**
- Services spin down after 15 minutes of inactivity
- First request takes 20-30 seconds to wake up
- Subsequent requests are fast

**Solutions:**
- Keep service active with a ping service (UptimeRobot, etc.)
- Upgrade to Starter plan ($7/month) to eliminate spin-down

### Issue: Database Expired (Free Tier)

**Free PostgreSQL databases expire after 90 days:**
- [ ] Check email for expiration warning from Render
- [ ] Go to Render → Database → Settings
- [ ] Click "Extend" to renew for another 90 days
- [ ] Or upgrade to paid database plan ($7/month) for permanent storage

---

## 🚀 Migrating to Railway Later

When you're ready to convince the client to upgrade to Railway:

1. **Export from Render:**
   ```bash
   # Backup database
   pg_dump <render-db-url> > render_backup.sql
   
   # Download uploads
   # Via Render Shell or admin panel export
   ```

2. **Import to Railway:**
   - Follow Railway deployment guide
   - Import PostgreSQL backup to Railway MySQL (convert if needed)
   - Upload media to Railway volume
   - Update REACT_APP_API_BASE to Railway URL
   - Rebuild frontend

3. **Comparison:**
   - Render Free: $0/month, spins down, 90-day DB expiration
   - Railway Hobby: $5/month, always on, permanent storage
   - Both: Auto-deploy from GitHub, SSL included, easy setup

---

*Deployment Guide Updated: November 14, 2025*  
*For: Thunder Road Bar & Grill React Application*  
*Architecture: Hybrid (Render Backend + GoDaddy Frontend)*  
*Total Monthly Cost: $8/month (FREE backend tier)*
