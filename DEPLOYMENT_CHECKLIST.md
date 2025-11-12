# Thunder Road Bar & Grill - Hybrid Deployment Guide

**Deployment Strategy:** Hybrid Approach (Recommended)  
**Frontend:** GoDaddy Deluxe Hosting  
**Backend + Database:** Railway.app  
**Date Prepared:** November 11, 2025  
**Total Monthly Cost:** ~$13/month ($8 GoDaddy + $5 Railway)

---

## 🎯 Deployment Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Users → GoDaddy (React Frontend) → Railway (Node.js API)  │
│                                          ↓                  │
│                                    Railway MySQL DB         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why This Approach?**
- ✅ Uses your existing GoDaddy Deluxe plan (no waste)
- ✅ Professional Node.js hosting on Railway
- ✅ Managed MySQL database included
- ✅ Automatic deployments from GitHub
- ✅ Built-in SSL on both platforms
- ✅ Persistent file storage for uploads
- ✅ Simple setup (30 minutes total)
- ✅ Easy to maintain and update

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
  REACT_APP_API_BASE=https://api.your-domain.com/api
  
  # Or if API is on same domain:
  REACT_APP_API_BASE=https://your-domain.com/api
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

- [ ] **Remove Development Dependencies**
  ```bash
  # Backend - optional, saves space
  cd backend
  npm prune --production
  
  # Frontend - not needed, we deploy build folder
  ```

#### 1.3 Database Preparation ✅

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

- [ ] **Backup Uploads Folder**
  ```bash
  # Create archive of all uploaded media
  cd backend
  tar -czf uploads_backup.tar.gz uploads/
  
  # Verify archive
  tar -tzf uploads_backup.tar.gz | head -20
  ```

- [ ] **Document Database Credentials**
  - Note down your GoDaddy MySQL database:
    - Database name
    - Database username
    - Database password
    - Database host (usually provided by GoDaddy)
    - Port (usually 3306)

---

## 🚀 Railway Backend Deployment (Phase 2)

> 📄 **Reference DEPLOYMENT_FILES.md** for the exact list of backend files to deploy to Railway.

### Phase 2: Deploy Backend + Database to Railway

#### 2.1 Create Railway Account

- [ ] Go to [railway.app](https://railway.app)
- [ ] Click "Start a New Project"
- [ ] Sign up with GitHub (recommended for easy deployments)
- [ ] Verify your email

#### 2.2 Create New Project

- [ ] Click "New Project" in Railway dashboard
- [ ] Select "Deploy from GitHub repo"
- [ ] Authorize Railway to access your GitHub
- [ ] Select repository: `jmars319/thunder-road-bar-and-grill-react`
- [ ] Railway will detect it's a Node.js project

#### 2.3 Configure Backend Service

- [ ] In your Railway project, click on the deployed service
- [ ] Go to "Settings" tab
- [ ] Configure the following:

**Root Directory:**
```
backend
```

**Start Command:**
```
node server.js
```

**Health Check Path:**
```
/api/health
```

**Port:** Railway auto-detects PORT environment variable (no action needed)

#### 2.4 Add MySQL Database

- [ ] In Railway dashboard, click "+ New"
- [ ] Select "Database" → "Add MySQL"
- [ ] Railway provisions a MySQL database instantly
- [ ] Click on the MySQL service
- [ ] Go to "Variables" tab
- [ ] Note these connection details (Railway auto-generates them):
  - `MYSQL_URL` (full connection string)
  - `MYSQL_HOST`
  - `MYSQL_PORT`
  - `MYSQL_USER`
  - `MYSQL_PASSWORD`
  - `MYSQL_DATABASE`

#### 2.5 Configure Environment Variables

- [ ] Go back to your backend service
- [ ] Click "Variables" tab
- [ ] Add these environment variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=${{PORT}}  # Railway provides this automatically

# Frontend URL (your GoDaddy domain)
FRONTEND_URL=https://thunderroadbarandgrill.com,https://www.thunderroadbarandgrill.com

# Trust proxy (Railway uses proxies)
TRUST_PROXY=true
FORCE_HTTPS=true

# Database (use Railway's MySQL variables)
DB_HOST=${{MySQL.MYSQL_HOST}}
DB_PORT=${{MySQL.MYSQL_PORT}}
DB_USER=${{MySQL.MYSQL_USER}}
DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
DB_NAME=${{MySQL.MYSQL_DATABASE}}
DB_CONN_LIMIT=10

# Authentication - PASTE YOUR GENERATED SECRET HERE
JWT_SECRET=YOUR_GENERATED_32_CHAR_SECRET_FROM_PHASE_1
JWT_EXPIRY=24h

# Security
ALLOW_DEV_ADMIN_HEADER=0
LOG_LEVEL=info
```

**💡 Railway Variable Syntax:**
- `${{PORT}}` - Railway's auto-assigned port
- `${{MySQL.VARIABLE_NAME}}` - References your MySQL service variables
- This creates automatic connections between services

#### 2.6 Configure Persistent Storage for Uploads

- [ ] In your backend service, go to "Settings"
- [ ] Scroll to "Volumes"
- [ ] Click "New Volume"
- [ ] Configure:
  - **Mount Path:** `/app/backend/uploads`
  - **Name:** `uploads-storage`
- [ ] Click "Add"

**This ensures uploaded media persists across deployments!**

#### 2.7 Import Database

Railway provides multiple options:

**Option A: Via Railway MySQL Client (Easiest)**
- [ ] In Railway, click your MySQL service
- [ ] Click "Data" tab
- [ ] Click "Connect" to get connection details
- [ ] From your local machine:
  ```bash
  # Get the MySQL connection string from Railway
  # Example: mysql://user:pass@host:port/dbname
  
  # Import your database
  mysql -h railway-host -P 3306 -u railway-user -p railway-db < production_data.sql
  # Paste password when prompted (from Railway Variables)
  ```

**Option B: Via MySQL Workbench / TablePlus (GUI)**
- [ ] Open MySQL Workbench or TablePlus
- [ ] Create new connection with Railway credentials:
  - Host: From Railway `MYSQL_HOST`
  - Port: From Railway `MYSQL_PORT`
  - User: From Railway `MYSQL_USER`
  - Password: From Railway `MYSQL_PASSWORD`
  - Database: From Railway `MYSQL_DATABASE`
- [ ] Connect
- [ ] Import your `production_data.sql` file

**Option C: Via Railway CLI (Advanced)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Connect to database
railway connect mysql

# Then import:
SOURCE /path/to/production_data.sql;
```

#### 2.8 Run Database Migrations (If Needed)

If you haven't imported data yet, run migrations:

- [ ] In Railway, go to your backend service
- [ ] Click "Deployments" tab
- [ ] Click the latest deployment
- [ ] Click "View Logs"
- [ ] In "Settings" → "Deploy Command", temporarily set:
  ```bash
  npm run migrate:latest && node server.js
  ```
- [ ] Redeploy (or it will auto-deploy)
- [ ] Check logs to verify migrations ran
- [ ] Change back to just `node server.js` after first deployment

#### 2.9 Update Admin Password in Railway Database

```bash
# From your local machine, connect to Railway MySQL
mysql -h railway-host -P 3306 -u railway-user -p railway-db

# Update admin password with your generated hash
UPDATE users SET password_hash = 'YOUR_GENERATED_BCRYPT_HASH' WHERE username = 'admin';

# Verify
SELECT username, is_active FROM users WHERE role = 'admin';
exit;
```

#### 2.10 Upload Existing Media Files

**Option A: Via Railway CLI**
```bash
# Install Railway CLI if not already installed
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Upload your uploads folder
# First, create a one-time upload script
railway run "mkdir -p /app/backend/uploads"
# Then use SCP or SFTP to upload files (Railway provides connection details)
```

**Option B: Re-upload via Admin Panel**
- After deployment, use your admin panel to re-upload images
- This is often simpler for smaller media libraries

**Option C: Use Railway's File Browser**
- Some Railway plans include file browser in dashboard
- Navigate to your volume and upload files directly

#### 2.11 Get Your Railway Backend URL

- [ ] In Railway dashboard, click your backend service
- [ ] Go to "Settings" tab
- [ ] Scroll to "Domains"
- [ ] Railway provides a default domain like:
  ```
  thunder-road-backend-production-xxxx.up.railway.app
  ```
- [ ] **SAVE THIS URL** - you'll need it for frontend configuration
- [ ] (Optional) Add custom domain: Click "Add Custom Domain"

#### 2.12 Test Railway Backend

```bash
# Test the Railway URL (use YOUR actual Railway URL)
curl https://thunder-road-backend-production-xxxx.up.railway.app/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# Test site settings
curl https://thunder-road-backend-production-xxxx.up.railway.app/api/site-settings

# Test menu
curl https://thunder-road-backend-production-xxxx.up.railway.app/api/menu
```

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

# Add your Railway backend URL:
REACT_APP_API_BASE=https://thunder-road-backend-production-xxxx.up.railway.app/api
# ⚠️ REPLACE with YOUR actual Railway URL from Phase 2.11
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

#### 3.3 Clear Old Files (If Upgrading Existing Site)

**⚠️ Skip this if it's a brand new domain**

- [ ] In cPanel, go to "Files" → "File Manager"
- [ ] Navigate to `public_html/` (or your domain's directory)
- [ ] Select all existing files (Ctrl+A or Cmd+A)
- [ ] Click "Delete"
- [ ] Confirm deletion

**💡 Or keep a backup:**
```
1. Select all files
2. Click "Compress"
3. Create a .zip backup
4. Download it
5. Then delete old files
```

#### 3.4 Upload Frontend Build

**Option A: Via cPanel File Manager (Easiest)**

- [ ] In cPanel → "Files" → "File Manager"
- [ ] Navigate to `public_html/` (or your domain's root directory)
- [ ] Click "Upload" button in top menu
- [ ] **CRITICAL:** Upload the **CONTENTS** of `frontend/build/`, not the build folder itself
  
  **What to upload:**
  ```
  frontend/build/
  ├── index.html          ← Upload this
  ├── static/             ← Upload this entire folder
  ├── favicon.ico         ← Upload this
  ├── manifest.json       ← Upload this
  ├── robots.txt          ← Upload this
  ├── asset-manifest.json ← Upload this
  └── logo192.png         ← Upload this
  ```

- [ ] Drag and drop files OR click "Select File"
- [ ] Wait for upload to complete (watch progress bar)
- [ ] Close upload dialog when done

**Option B: Via FTP/SFTP (FileZilla, Cyberduck)**

- [ ] Get FTP credentials from cPanel:
  - In cPanel → "Files" → "FTP Accounts"
  - Or use your cPanel username/password
- [ ] Connect via FTP/SFTP:
  - Host: `ftp.your-domain.com` or IP from cPanel
  - Username: Your cPanel username
  - Password: Your cPanel password
  - Port: 21 (FTP) or 22 (SFTP)
- [ ] Navigate to `public_html/`
- [ ] Upload all files from `frontend/build/` folder
- [ ] Wait for transfer to complete

**Option C: Via Zip Upload (Fastest for many files)**

```bash
# On your local machine, create a zip
cd frontend/build
zip -r build.zip ./*

# Upload build.zip via cPanel File Manager
# Then in File Manager:
# 1. Right-click build.zip
# 2. Select "Extract"
# 3. Extract to current directory
# 4. Delete build.zip after extraction
```

#### 3.5 Configure .htaccess for React Router

**⚠️ CRITICAL for Single Page Application:**

Create/edit `.htaccess` in `public_html/`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set Referrer-Policy "no-referrer"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
</IfModule>
```

#### 3.6 Verify Frontend Files

- [ ] In cPanel File Manager, verify `public_html/` contains:
  ```
  public_html/
  ├── .htaccess           ← You just created this
  ├── index.html          ← Main React app entry
  ├── static/             ← Contains all JS/CSS
  │   ├── css/
  │   ├── js/
  │   └── media/
  ├── favicon.ico
  ├── manifest.json
  ├── robots.txt
  └── asset-manifest.json
  ```

---

## 🔐 SSL & Domain Configuration (Phase 4)

### Phase 4: Configure HTTPS and Domain

#### 4.1 Enable SSL Certificate on GoDaddy

**GoDaddy Deluxe includes free SSL!**

- [ ] In GoDaddy cPanel → "Security" → "SSL/TLS Status"
- [ ] Find your domain in the list
- [ ] Click "Run AutoSSL"
- [ ] Wait for certificate to be issued (usually 1-5 minutes)
- [ ] Verify status shows "Active" with green checkmark

**Alternative: Manual Let's Encrypt**
- [ ] In cPanel → "Security" → "Let's Encrypt SSL"
- [ ] Select your domain
- [ ] Click "Issue"

#### 4.2 Force HTTPS Redirect

This is already in your `.htaccess`, but verify it's enabled:

```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

#### 4.3 Update Railway FRONTEND_URL

Now that your GoDaddy site is live:

- [ ] Go to Railway dashboard
- [ ] Click your backend service
- [ ] Go to "Variables" tab
- [ ] Update `FRONTEND_URL` with your actual domain:
  ```
  FRONTEND_URL=https://thunderroadbarandgrill.com,https://www.thunderroadbarandgrill.com
  ```
- [ ] Save changes (Railway will auto-redeploy)

**💡 Why this matters:** CORS security requires exact domain matches

#### 4.4 Configure Railway Custom Domain (Optional)

If you want a custom subdomain like `api.thunderroadbarandgrill.com`:

- [ ] In Railway, go to your backend service
- [ ] Click "Settings" → "Domains"
- [ ] Click "Add Custom Domain"
- [ ] Enter: `api.thunderroadbarandgrill.com`
- [ ] Railway provides DNS instructions (CNAME record)
- [ ] In GoDaddy DNS Management:
  - Type: CNAME
  - Name: api
  - Value: (provided by Railway)
  - TTL: 1 Hour
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Railway automatically provisions SSL
- [ ] Update frontend `.env.production`:
  ```
  REACT_APP_API_BASE=https://api.thunderroadbarandgrill.com/api
  ```
- [ ] Rebuild and redeploy frontend

---

## 🔍 Post-Deployment Testing (Phase 5)

### Phase 5: Comprehensive Testing

#### 5.1 Test Railway Backend API

```bash
# Health check (use YOUR Railway URL)
curl https://thunder-road-backend-production-xxxx.up.railway.app/api/health

# Expected: {"status":"ok","timestamp":"..."}

# Site settings (public)
curl https://thunder-road-backend-production-xxxx.up.railway.app/api/site-settings

# Menu (public)
curl https://thunder-road-backend-production-xxxx.up.railway.app/api/menu

# Business hours
curl https://thunder-road-backend-production-xxxx.up.railway.app/api/business-hours
```

**✅ All should return JSON data without errors**

#### 5.2 Test GoDaddy Frontend

- [ ] Visit your domain: `https://thunderroadbarandgrill.com`
- [ ] Verify HTTPS is working (padlock icon in browser)
- [ ] Check browser console (F12) for errors
- [ ] Verify no CORS errors

- [ ] **Home Page**
  - Loads correctly
  - Images display
  - Hero section working
  - Menu section displays

- [ ] **Navigation**
  - All menu links work
  - Smooth scrolling functions
  - Mobile menu works

- [ ] **Forms**
  - [ ] Contact form submits
  - [ ] Reservation form works
  - [ ] Job application form (with/without resume)
  - [ ] Newsletter signup

- [ ] **Admin Panel**
  - [ ] Login page accessible at `/admin`
  - [ ] Can log in with credentials
  - [ ] Dashboard loads
  - [ ] All admin modules accessible
  - [ ] Can upload media
  - [ ] Can edit menu
  - [ ] Can update settings
  - [ ] Can view messages/reservations

#### 5.3 Test Frontend → Backend Integration

- [ ] **Home Page**
  - Loads correctly without errors
  - Site settings display (business name, tagline)
  - Logo displays
  - Hero section working
  - Menu section displays with data from Railway

- [ ] **Navigation**
  - All menu links work
  - Smooth scrolling functions
  - Mobile menu works

#### 5.4 Test Forms

- [ ] **Contact Form**
  - Fill out and submit
  - Verify success message appears
  - Check Railway logs for submission
  - (Optional) Check database for entry

- [ ] **Reservation Form**
  - Fill out with valid data
  - Submit reservation
  - Verify confirmation message

- [ ] **Job Application Form**
  - Submit without resume (should work)
  - Submit with resume (should work)
  - Verify file upload to Railway volume

- [ ] **Newsletter Signup**
  - Enter email and submit
  - Verify success message

#### 5.5 Test Admin Panel

- [ ] Navigate to `/admin`
- [ ] Login page displays correctly
- [ ] Log in with your admin credentials
- [ ] Verify JWT token stored in localStorage
- [ ] Dashboard loads successfully
- [ ] Test each admin module:
  - [ ] Site Settings - update and save
  - [ ] Menu Management - add/edit/delete item
  - [ ] Media Library - upload new image
  - [ ] About Content - edit and save
  - [ ] Business Hours - update hours
  - [ ] Job Positions - add/edit position
  - [ ] Messages - view submissions
  - [ ] Reservations - view reservations

#### 5.6 Test Authentication Security

- [ ] Log out of admin panel
- [ ] Try to access `/admin/dashboard` directly (should redirect to login)
- [ ] Try to access admin API endpoint without token:
  ```bash
  curl https://thunder-road-backend-production-xxxx.up.railway.app/api/admin/site-settings
  # Should return 401 Unauthorized
  ```
- [ ] Log back in and verify token works

#### 5.7 Test Security Features

- [ ] **HTTPS**
  - All pages load over HTTPS
  - No mixed content warnings
  - SSL certificate valid

- [ ] **Headers**
  ```bash
  curl -I https://your-domain.com
  # Check for:
  # - X-Content-Type-Options: nosniff
  # - X-Frame-Options: DENY
  # - Strict-Transport-Security (HSTS)
  ```

- [ ] **Rate Limiting**
  - Try login multiple times (should be rate-limited after 5 attempts)
  - Try job application multiple times (should limit after 2)

- [ ] **File Uploads**
  - Upload valid image (should work)
  - Try uploading executable file (should be rejected)
  - Upload SVG (should be sanitized)

---

## 📊 Monitoring and Maintenance (Phase 6)

### Phase 6: Setup Monitoring & Backups

#### 6.1 Railway Logs Monitoring

**View Real-Time Logs:**
- [ ] In Railway dashboard, click your backend service
- [ ] Click "Deployments" tab
- [ ] Click latest deployment
- [ ] Click "View Logs"
- [ ] Logs update in real-time

**Via Railway CLI:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link project
railway login
railway link

# View logs
railway logs
```

**Set Up Log Alerts (Railway Pro):**
- [ ] In Railway, go to project settings
- [ ] Configure webhook notifications
- [ ] Integrate with Slack/Discord for error alerts

#### 6.2 Database Backups

**Railway Automatic Backups:**
- Railway MySQL includes automatic daily backups
- Retained for 7 days on Hobby plan
- Access via Railway dashboard → MySQL service → "Backups"

**Manual Backup Script (Run Locally):**
```bash
#!/bin/bash
# save as: backup-railway-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups/thunderroad"

mkdir -p $BACKUP_DIR

# Get Railway MySQL connection string from Railway dashboard
# Format: mysql://user:pass@host:port/dbname

RAILWAY_HOST="containers-us-west-xxx.railway.app"
RAILWAY_PORT="3306"
RAILWAY_USER="root"
RAILWAY_PASS="your-password-from-railway"
RAILWAY_DB="railway"

mysqldump -h $RAILWAY_HOST -P $RAILWAY_PORT -u $RAILWAY_USER -p$RAILWAY_PASS $RAILWAY_DB > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

**Set up automated backups:**
```bash
# Make script executable
chmod +x backup-railway-db.sh

# Add to crontab (runs daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup-railway-db.sh
```

#### 6.3 Media Files Backup

**Download from Railway Volume:**

Railway doesn't provide direct volume access, so backup via:

1. **Create backup endpoint** (add to backend):
```javascript
// In backend/routes/admin.js or create backup.js
router.get('/admin/backup/uploads', adminAuth, async (req, res) => {
  const archiver = require('archiver');
  const archive = archiver('zip', { zlib: { level: 9 }});
  
  res.attachment('uploads-backup.zip');
  archive.pipe(res);
  archive.directory('uploads/', false);
  archive.finalize();
});
```

2. **Or download via admin panel** - implement bulk download feature

3. **Or periodically re-upload** to cloud storage (S3, Cloudflare R2)

#### 6.4 Frontend Backup

**GoDaddy Automatic Backups:**
- GoDaddy Deluxe includes automatic daily backups
- Access via cPanel → "Files" → "Backup Wizard"

**Manual Backup:**
```bash
# Download entire public_html via FTP
# Or in cPanel:
# 1. File Manager → public_html
# 2. Select all files
# 3. Click "Compress"
# 4. Download the zip file
```

#### 6.5 Setup Uptime Monitoring

**Use UptimeRobot (Free tier available):**

- [ ] Sign up at [uptimerobot.com](https://uptimerobot.com)
- [ ] Add monitors:
  - **Frontend Monitor:**
    - Type: HTTP(s)
    - URL: `https://thunderroadbarandgrill.com`
    - Interval: 5 minutes
  - **Backend Monitor:**
    - Type: HTTP(s)
    - URL: `https://thunder-road-backend-production-xxxx.up.railway.app/api/health`
    - Interval: 5 minutes
- [ ] Configure alert contacts (email, SMS, Slack)
- [ ] Verify alerts work by temporarily stopping Railway service

**Alternative: Pingdom, StatusCake, or Railway's built-in monitoring**

#### 6.6 Error Tracking (Optional but Recommended)

**Integrate Sentry for error tracking:**

```bash
# Install Sentry
npm install @sentry/node @sentry/react

# Frontend: src/index.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
});

# Backend: server.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
});
```

Free tier includes:
- Automatic error reporting
- Stack traces
- User context
- Performance monitoring

---

## 🔐 Security Hardening Checklist (Phase 7)

### Phase 7: Production Security

#### 7.1 Railway Security

- [ ] **Environment Variables**
  - Verify JWT_SECRET is strong (32+ characters)
  - Never commit .env files to Git
  - Use Railway's variable references for DB credentials

- [ ] **Database Security**
  - Railway MySQL is private by default (good!)
  - Only accessible from your Railway services
  - Use strong passwords (Railway auto-generates)

- [ ] **Application Updates**
  ```bash
  # Run security audit regularly
  cd backend
  npm audit
  npm audit fix
  
  # Update dependencies
  npm update
  
  # Commit and push - Railway auto-deploys
  git add package*.json
  git commit -m "chore: update dependencies"
  git push
  ```

#### 7.2 GoDaddy Security

- [ ] **File Permissions via cPanel**
  - public_html: 755 (read/execute for all)
  - .htaccess: 644 (read for all, write for owner)
  - index.html: 644

- [ ] **Secure cPanel**
  - Use strong cPanel password
  - Enable two-factor authentication if available
  - Restrict FTP access to your IP if possible

- [ ] **SSL Certificate**
  - Verify SSL is active and valid
  - Check expiration date (should auto-renew)
  - Test at: https://www.ssllabs.com/ssltest/

#### 7.3 Application Security

- [ ] **Test Rate Limiting**
  ```bash
  # Try logging in multiple times with wrong password
  # Should be blocked after 5 attempts in 15 minutes
  
  for i in {1..10}; do
    curl -X POST https://your-railway-url/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"wrong"}'
  done
  # Should see "Too many requests" after attempt 5
  ```

- [ ] **Verify CORS Protection**
  ```bash
  # Try accessing from wrong origin (should fail)
  curl -X GET https://your-railway-url/api/site-settings \
    -H "Origin: https://malicious-site.com"
  # Should not have CORS headers or be blocked
  ```

- [ ] **Test File Upload Security**
  - Try uploading .exe file (should be rejected)
  - Try uploading PHP file (should be rejected)
  - Try uploading oversized file (should be rejected)
  - Verify SVG sanitization works

- [ ] **Check Admin Authentication**
  - Verify can't access admin routes without token
  - Verify token expires after 24 hours
  - Verify dev admin header is disabled (ALLOW_DEV_ADMIN_HEADER=0)

---

## 📝 Environment Configuration Reference

### Development vs Production Differences

| Configuration | Development | Production (Railway) |
|--------------|-------------|----------------------|
| NODE_ENV | development | **production** |
| PORT | 5001 | **${{PORT}}** (Railway provides) |
| JWT_SECRET | dev-secret-change-in-production | **Strong 32+ char random** |
| DB_HOST | localhost | **${{MySQL.MYSQL_HOST}}** |
| DB_USER | root | **${{MySQL.MYSQL_USER}}** |
| DB_PASSWORD | local-password | **${{MySQL.MYSQL_PASSWORD}}** |
| DB_NAME | thunder_road | **${{MySQL.MYSQL_DATABASE}}** |
| FRONTEND_URL | http://localhost:3000 | **https://thunderroadbarandgrill.com** |
| TRUST_PROXY | false | **true** (Railway uses proxies) |
| FORCE_HTTPS | false | **true** |
| ALLOW_DEV_ADMIN_HEADER | 0 or 1 (dev testing) | **0 (NEVER enable)** |
| LOG_LEVEL | debug | **info or warn** |

### Frontend Environment Variables

| Configuration | Development | Production (GoDaddy) |
|--------------|-------------|----------------------|
| REACT_APP_API_BASE | http://localhost:5001/api | **https://your-railway-url.railway.app/api** |

---

## ⚠️ Troubleshooting Common Issues

### Issue: Railway Backend Not Starting

**Check Railway Logs:**
- [ ] Go to Railway → Your backend service → Deployments
- [ ] Click latest deployment → View Logs
- [ ] Look for error messages

**Common Issues:**

1. **Database Connection Failed**
   ```
   Solution: Verify environment variables in Railway
   - Check DB_HOST=${{MySQL.MYSQL_HOST}}
   - Ensure MySQL service is running
   - Click MySQL service → Check status
   ```

2. **Missing Environment Variables**
   ```
   Solution: Go to Variables tab
   - Verify JWT_SECRET is set
   - Verify all DB_ variables reference MySQL service
   - Check FRONTEND_URL is correct
   ```

3. **Build Failed**
   ```
   Solution: Check package.json
   - Ensure "start": "node server.js" exists
   - Verify all dependencies are in package.json
   - Push to Git and Railway will rebuild
   ```

### Issue: Frontend Shows Blank Page

**Check Browser Console (F12):**

1. **Wrong API_BASE URL**
   ```
   Error: "Failed to fetch" or "Network Error"
   Solution:
   - Verify .env.production has correct Railway URL
   - Rebuild frontend: npm run build
   - Re-upload to GoDaddy
   ```

2. **CORS Errors**
   ```
   Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
   Solution in Railway:
   - Variables tab → Update FRONTEND_URL
   - Must match your GoDaddy domain EXACTLY
   - No trailing slashes
   - Include both www and non-www:
     FRONTEND_URL=https://thunderroadbarandgrill.com,https://www.thunderroadbarandgrill.com
   - Railway will auto-redeploy
   ```

3. **Missing .htaccess**
   ```
   Error: 404 on page refresh
   Solution:
   - Verify .htaccess exists in public_html/
   - Verify RewriteRule is present
   - Check file permissions: 644
   ```

### Issue: Images Not Loading

**Check:**

1. **Railway Volume Not Mounted**
   ```
   Solution:
   - Railway → Backend service → Settings → Volumes
   - Verify volume exists with mount path: /app/backend/uploads
   - If not, add volume and redeploy
   ```

2. **Images Not Uploaded**
   ```
   Solution:
   - Re-upload images via admin panel
   - Or bulk upload via Railway CLI
   ```

3. **Wrong Image URLs**
   ```
   Check database:
   mysql -h railway-host -u railway-user -p railway-db
   SELECT file_url FROM media_library LIMIT 10;
   
   URLs should be: /uploads/category/filename.jpg
   ```

### Issue: Admin Login Not Working

**Symptoms: "Invalid credentials" even with correct password**

**Solutions:**

1. **Verify Admin Password Hash**
   ```bash
   # Generate new hash locally
   node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YourPassword123', 10, (e,h) => console.log(h));"
   
   # Update in Railway database
   mysql -h railway-host -u railway-user -p railway-db
   UPDATE users SET password_hash = 'YOUR_NEW_HASH' WHERE username = 'admin';
   ```

2. **Check JWT_SECRET**
   ```
   Railway → Backend → Variables
   Verify JWT_SECRET is set and is not empty
   ```

3. **CORS Blocking Login**
   ```
   Check browser console for CORS errors
   Update FRONTEND_URL in Railway if needed
   ```

### Issue: Forms Not Submitting

**Check:**

1. **Rate Limiting**
   ```
   Error: "Too many requests"
   Solution: Wait 15 minutes or check Railway logs for rate limit hits
   ```

2. **Validation Errors**
   ```
   Check browser console and Railway logs
   Common: Missing required fields, invalid email format
   ```

3. **File Upload Too Large**
   ```
   Error: "File too large"
   Solution: Check backend limits in server.js
   Default: 10MB for general uploads
   ```

### Issue: SSL Certificate Errors (GoDaddy)

**Solution:**
```
1. GoDaddy cPanel → Security → SSL/TLS Status
2. Click "Run AutoSSL" for your domain
3. Wait 5 minutes for issuance
4. Verify green checkmark appears
5. Test: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

### Issue: Railway Deployment Hanging

**Solution:**
```
1. Check build logs for errors
2. Verify railway.json exists (optional)
3. Try manual redeploy: Click "Redeploy" button
4. Check Railway status: https://railway.app/status
```

### Issue: Database Migration Failed

**Solution:**
```
1. Railway → MySQL service → Data tab
2. Verify tables don't already exist
3. If they do, drop database and re-import:
   DROP DATABASE railway;
   CREATE DATABASE railway;
   USE railway;
   SOURCE /path/to/production_data.sql;
```

---

## 📞 Support Resources

### GoDaddy Support

- **Customer Support:** 480-505-8877
- **Technical Support:** Available 24/7 via phone or chat
- **Help Center:** https://www.godaddy.com/help
- **Community Forum:** https://community.godaddy.com/

**Common GoDaddy Help Topics:**
- SSL certificate issues
- FTP access
- cPanel help
- Domain DNS management

### Railway Support

- **Help Center:** https://docs.railway.app
- **Discord Community:** https://discord.gg/railway
- **Email Support:** team@railway.app (Hobby plan+)
- **Status Page:** https://railway.app/status

**Common Railway Help Topics:**
- Deployment issues
- Database connections
- Volume storage
- Environment variables

---

## ✅ Final Pre-Launch Checklist

### Before Going Live

- [ ] All environment variables set correctly
- [ ] Database imported and tested
- [ ] Admin password changed from default
- [ ] JWT_SECRET is strong and unique
- [ ] SSL certificate installed and working
- [ ] HTTPS redirect configured
- [ ] All forms tested and working
- [ ] Admin panel accessible and functional
- [ ] Images and media displaying correctly
- [ ] Site settings updated with real business info
- [ ] Contact information correct (phone, email, address)
- [ ] Social media links working
- [ ] Google Analytics/tracking code added (if needed)
- [ ] Backup strategy in place
- [ ] Monitoring tools configured
- [ ] DNS propagation complete (can take 24-48 hours)
- [ ] Test from multiple devices (desktop, mobile, tablet)
- [ ] Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Performance test with Google PageSpeed Insights
- [ ] Security scan with SSL Labs: https://www.ssllabs.com/ssltest/

---

## 🎉 Post-Launch Tasks

### After Going Live

- [ ] **Week 1:**
  - Monitor logs daily for errors
  - Check form submissions working
  - Verify admin functions
  - Test performance
  - Check search engine indexing

- [ ] **Week 2-4:**
  - Review analytics
  - Gather user feedback
  - Address any reported issues
  - Optimize performance

- [ ] **Ongoing:**
  - Regular database backups
  - Security updates
  - Content updates via admin panel
  - Monitor uptime and performance

---

## 📚 Additional Resources

- **React Deployment:** https://create-react-app.dev/docs/deployment/
- **Node.js Production Best Practices:** https://nodejs.org/en/docs/guides/nodejs-docker-webapp/
- **GoDaddy Help Center:** https://www.godaddy.com/help
- **Let's Encrypt:** https://letsencrypt.org/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/usage/quick-start/

---

## 🆘 Emergency Rollback Procedures

### If Something Goes Wrong

**Quick Diagnosis:**
1. Check Railway logs for backend errors
2. Check browser console (F12) for frontend errors
3. Check GoDaddy cPanel error logs
4. Verify both services are running (Railway dashboard, GoDaddy cPanel)

### Rollback Railway Backend

**Option A: Rollback to Previous Deployment**
- [ ] Railway dashboard → Backend service → Deployments
- [ ] Find last working deployment
- [ ] Click ⋮ menu → "Redeploy"
- [ ] Wait for deployment to complete

**Option B: Rollback Git Commit**
```bash
# On your local machine
git log --oneline  # Find last working commit
git revert HEAD    # Or git reset --hard <commit-hash>
git push --force   # Railway auto-deploys

# ⚠️ Use --force carefully, only if recent changes broke production
```

### Restore Database

**From Railway Automatic Backup:**
- [ ] Railway → MySQL service → Backups tab
- [ ] Select backup from before issue occurred
- [ ] Click "Restore"

**From Manual Backup:**
```bash
# Restore from your local backup
mysql -h railway-host -u railway-user -p railway-db < backup_20251111.sql

# Verify restoration
mysql -h railway-host -u railway-user -p railway-db
SHOW TABLES;
SELECT COUNT(*) FROM menu_items;
exit;
```

### Rollback GoDaddy Frontend

**Option A: Re-upload Previous Build**
```bash
# If you kept previous build
cd frontend-old-build/
# Upload via cPanel File Manager or FTP
```

**Option B: Rebuild from Git**
```bash
git checkout <previous-commit-hash>
cd frontend
npm run build
# Upload build/ contents to GoDaddy
git checkout main  # Return to latest
```

**Option C: Restore from GoDaddy Backup**
- [ ] GoDaddy cPanel → Files → Backup Wizard
- [ ] Select date before issue
- [ ] Restore home directory
- [ ] Wait for restoration

### Emergency Contacts

- **Railway Issues:** Discord (fastest response) or team@railway.app
- **GoDaddy Issues:** 480-505-8877 (24/7 support)
- **Critical Site Down:** Start with Railway logs, then contact support

---

## 🚀 Continuous Deployment & Updates

### Deploying Updates

**Backend Updates (Auto-Deploy):**
```bash
# Make changes to backend code
git add .
git commit -m "feat: add new feature"
git push

# Railway automatically:
# 1. Detects push
# 2. Builds new version
# 3. Runs tests
# 4. Deploys if successful
# 5. Keeps old version running until new one is ready (zero-downtime)
```

**Frontend Updates:**
```bash
# Make changes to frontend code
cd frontend
npm run build

# Upload new build to GoDaddy via:
# - cPanel File Manager
# - FTP/SFTP
# - Zip upload method
```

**Database Migrations:**
```bash
# Add new migration file
cd backend/migrations
# Create new migration

# Push to Git
git add migrations/
git commit -m "feat: add new database migration"
git push

# Railway will auto-deploy
# Migration runs automatically if configured in Deploy Command
```

### Monitoring Deployments

**Railway:**
- Watch deployments in real-time
- Check logs for errors
- Verify health check passes

**GoDaddy:**
- Test site after upload
- Check browser console for errors
- Verify API calls working

---

## 📚 Additional Resources

### Documentation

- **React Deployment:** https://create-react-app.dev/docs/deployment/
- **Railway Docs:** https://docs.railway.app
- **GoDaddy cPanel Guide:** https://www.godaddy.com/help/cpanel
- **Node.js Best Practices:** https://nodejs.org/en/docs/guides/

### Tutorials

- **Railway + MySQL:** https://docs.railway.app/databases/mysql
- **React Router + Apache:** https://create-react-app.dev/docs/deployment/#serving-apps-with-client-side-routing
- **GoDaddy File Manager:** https://www.godaddy.com/help/manage-my-files-in-file-manager-2100

### Tools

- **Railway CLI:** https://docs.railway.app/develop/cli
- **FileZilla (FTP):** https://filezilla-project.org/
- **MySQL Workbench:** https://www.mysql.com/products/workbench/
- **TablePlus (DB GUI):** https://tableplus.com/

---

## 💰 Cost Breakdown

| Service | Plan | Monthly Cost | What's Included |
|---------|------|--------------|-----------------|
| **GoDaddy Deluxe** | Deluxe Hosting | ~$8/month | Frontend hosting, 10 websites, 50GB storage, SSL, email |
| **Railway** | Hobby Plan | $5/month | Backend hosting, MySQL database, $5 usage credit, volumes, SSL |
| **Total** | | **$13/month** | Full-stack professional hosting |

**Compared to Alternatives:**
- VPS Hosting: $20-50/month + management time
- Managed WordPress: $25-100/month (limited functionality)
- Custom Hosting: $30-100/month setup + monthly fees

**Your Setup Benefits:**
- ✅ Professional infrastructure
- ✅ Automatic deployments
- ✅ Managed database with backups
- ✅ SSL on both platforms
- ✅ Easy to scale
- ✅ Minimal maintenance

---

## 🎯 Quick Reference Commands

### Railway CLI
```bash
railway login              # Login to Railway
railway link               # Link to project
railway logs               # View logs
railway run <command>      # Run command in Railway env
railway connect mysql      # Connect to MySQL
railway status             # Check deployment status
```

### Database Commands
```bash
# Export database
mysqldump -h railway-host -u user -p dbname > backup.sql

# Import database
mysql -h railway-host -u user -p dbname < backup.sql

# Connect to database
mysql -h railway-host -u user -p dbname
```

### Git Commands
```bash
git status                 # Check changes
git add .                  # Stage all changes
git commit -m "message"    # Commit changes
git push                   # Push to GitHub (triggers Railway deploy)
git log --oneline          # View commit history
git revert HEAD            # Undo last commit
```

### Frontend Build
```bash
cd frontend
npm run build              # Build for production
npx serve -s build         # Test build locally
```

---

*Deployment Guide Updated: November 11, 2025*  
*For: Thunder Road Bar & Grill React Application*  
*Architecture: Hybrid (Railway Backend + GoDaddy Frontend)*  
*Total Monthly Cost: $13/month*
