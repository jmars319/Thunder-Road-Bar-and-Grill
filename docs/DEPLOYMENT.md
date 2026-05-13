# Thunder Road Bar & Grill - Deployment Guide

**Deployment Strategy:** PHP Backend + React Frontend on GoDaddy Deluxe  
**Last Updated:** November 24, 2025  
**Total Monthly Cost:** $8/month (included in existing GoDaddy plan)  
**Estimated Time:** 15-20 minutes (updates), 45 minutes (fresh deployment)

> **📌 PENDING DEPLOYMENT:** 5 commits from November 22, 2025 await deployment.  
> See [November 22 Updates](#november-22-2025-pending-updates) section below for quick update instructions.

---

## Overview

This application deploys entirely to **GoDaddy Deluxe hosting**, eliminating the need for separate backend hosting services. The PHP backend provides full REST API functionality while staying within the existing hosting budget.

**Architecture:**
- **Frontend:** React SPA in `public_html/`
- **Backend:** PHP REST API in `public_html/api/`
- **Database:** MySQL via GoDaddy cPanel
- **Uploads:** Stored in `public_html/api/uploads/`

**Cost Savings:** $7/month ($84/year) compared to Node.js on external hosting.

---

## Rapid Packaging (local)

From repo root:

```bash
bash scripts/make-deploy-zips.sh   # build backend-deploy.zip + frontend-deploy.zip
bash scripts/check-deploy-zips.sh  # confirm entrypoints + excludes before upload
```

These archives mirror the manual steps in this guide (backend zip excludes `.env*`, `uploads/`; frontend zip contains `build/` plus `.htaccess` when present).

Deploy archive policy:
- `backend-deploy.zip` contains the PHP runtime, required `vendor/`, routes, middleware, utils, cache/upload deny placeholders, and `.htaccess`.
- `backend-deploy.zip` intentionally excludes `.env*`, uploaded media, incoming files, logs/cache runtime data, tests, local scripts, README/dev files, composer manifests, source maps, git files, and macOS metadata. It includes `uploads/.htaccess` as the upload-directory guard only.
- `frontend-deploy.zip` contains only the React build output and required public assets. It must not contain source maps, secrets, or git files.
- Preserve `/api/.env`, `/api/uploads/`, `/api/incoming/`, `/api/logs/`, and writable cache/runtime folders on the server. Do not delete the live `/api` folder unless those server-only files are backed up and restored.
- Run `bash scripts/check-deploy-zips.sh` before every upload.

---

## Prerequisites

- **GoDaddy Deluxe Hosting** (already have)
- **PHP:** 7.4+ (GoDaddy provides)
- **MySQL:** 5.7+ (GoDaddy provides)
- **FTP/cPanel Access** to GoDaddy
- **Local Development:** Node.js, PHP, MySQL

---

## Phase 1: Prepare Backend

### 1.1 Configure Environment

```bash
cd backend

# Create production .env (DO NOT commit)
cp .env.example .env

# Edit .env with production values:
APP_ENV=production
APP_DEBUG=false
JWT_SECRET=<generate-with: openssl rand -base64 32>
DB_HOST=localhost
DB_USER=<godaddy-mysql-user>
DB_PASSWORD=<godaddy-mysql-password>
DB_NAME=thunder_road
FRONTEND_URL=https://trbgmidway.com
SEND_EMAILS=false     # keep false until production smoke tests complete
```

**Email gating rules:** Production instances only send real email when `APP_ENV=production`, `SEND_EMAILS=true`, and `SENDGRID_API_KEY` is set. All other combinations (including staging) will skip delivery, log `[email:skip]` previews, and return success to the caller. After deploying, keep `SEND_EMAILS=false` until you have verified the site manually, then flip it deliberately.

### 1.2 Generate Security Credentials

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate bcrypt password hash for admin
php -r "echo password_hash('your-new-password', PASSWORD_BCRYPT, ['cost' => 10]);"
```

---

## Phase 2: Database Setup

### 2.1 Create Database in GoDaddy

1. **Login to GoDaddy** → My Products → Hosting → Manage
2. **cPanel** → MySQL Databases
3. **Create Database:**
   - Name: `thunder_road`
   - Click "Create Database"
4. **Create User:**
   - Username: (choose secure username)
   - Password: (generate strong password)
   - Click "Create User"
5. **Grant Privileges:**
   - Select user
   - Select database
   - Grant ALL PRIVILEGES
   - Click "Add"
6. **Note Credentials:**
   - Database name: `username_thunder_road`
   - Database user: `username_dbuser`
   - Database password: (your generated password)
   - Host: `localhost`

### 2.2 Import Schema

1. **Navigate to:** cPanel → phpMyAdmin
2. **Select Database:** `username_thunder_road`
3. **Import Tab:**
   - Click "Choose File"
   - Select: `/database/schema.sql`
   - Click "Go"
4. **Verify Tables Created:**
   - Check left sidebar shows all tables
   - Should see: users, menu_categories, menu_items, etc.

### 2.3 Update Admin Password

In phpMyAdmin:
```sql
USE username_thunder_road;

UPDATE users 
SET password_hash = '$2y$10$<your-bcrypt-hash-from-1.2>' 
WHERE username = 'admin';

-- Verify
SELECT username, is_active FROM users WHERE username = 'admin';
```

---

## Phase 3: Upload PHP Backend

### 3.1 Prepare Files for Upload

**IMPORTANT:** The repository does **NOT** include `vendor/`, `.env`, or `uploads/`. You must prepare these separately:

```bash
cd backend

# Install composer dependencies
composer install --no-dev --optimize-autoloader

# Create production .env from example
cp .env.production.example .env
# Edit .env with actual production credentials (see section 1.1)
```

### 3.2 Via FTP (FileZilla, Cyberduck)

1. **Connect to GoDaddy FTP:**
   - Host: `ftp.trbgmidway.com` (or IP from cPanel)
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21 (FTP) or 22 (SFTP)

2. **Navigate to:** `public_html/`

3. **Create Folder:** `api/`

4. **Upload `backend/` contents to `public_html/api/`:**
   ```
   public_html/
   └── api/
       ├── .htaccess
       ├── .env               (create from .env.production.example)
       ├── index.php
       ├── router.php
       ├── composer.json
       ├── composer.lock
       ├── vendor/            (run composer install locally, then upload)
       ├── middleware/
       ├── routes/
       ├── utils/
       ├── uploads/           (create empty folder with 755 permissions)
       ├── cache/             (create empty folder with 755 permissions)
       └── logs/              (create empty folder with 755 permissions)
   ```

5. **Verify `.env` uploaded** (critical for security)

**Files to EXCLUDE from upload:**
- `.env.example`, `.env.production.example` (documentation only)
- `test-*.php` (test scripts)
- `README.md`, `.gitignore` (development files)
- `start-dev.sh`, `test-api.sh` (local dev scripts)

### 3.2 Via cPanel File Manager

1. **Navigate to:** cPanel → File Manager
2. **Go to:** `public_html/`
3. **Create Directory:** `api`
4. **Upload Files:**
   - Click "Upload"
   - Select all `backend/` files
   - Wait for completion
5. **Verify `.htaccess` visible** (enable "Show Hidden Files")

### 3.3 Via Composer on Server (Alternative)

If your hosting supports SSH and composer:
```bash
# SSH into server
ssh user@server

# Navigate to api folder
cd ~/public_html/api

# Upload code files (excluding vendor/)
# Then run composer on server:
composer install --no-dev --optimize-autoloader
```

### 3.4 Set File Permissions

Via FTP client or cPanel File Manager:
```
Directories:    755
PHP files:      644
.env:           640 (or 644)
.htaccess:      644
uploads/:       755 (writable)
cache/:         755 (writable)
logs/:          755 (writable)
vendor/:        755
```

### 3.5 Media pipeline checklist

- Confirm `backend/uploads/` contains `incoming/`, `variants/optimized`, `variants/webp`, and `manifests/` directories. They must remain writable between deploys.
- Run `php backend/scripts/remove_resume_media.php` once after upgrading to ensure legacy resume uploads are purged from the database and disk.
- If migrating from the legacy media table, run `php backend/scripts/rehydrate_media_variants.php` after copying files so manifests and responsive variants are regenerated.

---

## Phase 4: Upload Frontend

### 4.1 Build Production Frontend

```bash
cd frontend

# Create production environment
cat > .env.production << 'EOF'
REACT_APP_API_BASE=https://trbgmidway.com/api
EOF

# Build
npm run build

# Verify build folder
ls -la build/
```

### 4.2 Upload to GoDaddy

**Via cPanel File Manager:**
1. Navigate to `public_html/`
2. **Delete old files** (if upgrading existing site)
3. Upload **contents** of `frontend/build/`:
   - `index.html`
   - `static/` (entire folder)
   - `favicon.ico`
   - `manifest.json`
   - `robots.txt`
   - `asset-manifest.json`

**Via FTP:**
```bash
cd frontend/build
# Upload ALL files to public_html/
```

### 4.3 Create/Verify .htaccess for React Router

In `public_html/.htaccess`:
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

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

---

## Phase 5: SSL Configuration

### 5.1 Enable SSL Certificate

1. **GoDaddy cPanel** → Security → SSL/TLS Status
2. **Find your domain:** `trbgmidway.com`
3. **Click:** "Run AutoSSL"
4. **Wait:** 5-10 minutes for certificate issuance
5. **Verify:** Green checkmark appears

### 5.2 Force HTTPS

Already configured in `.htaccess` (both root and api):
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## Phase 6: Testing

### 6.1 Test Backend API

```bash
# Health check
curl https://trbgmidway.com/api/health
# Expected: {"status":"OK","message":"Thunder Road API is running"}

# Test public endpoints
curl https://trbgmidway.com/api/menu
curl https://trbgmidway.com/api/site-settings
curl https://trbgmidway.com/api/business-hours

# Test admin login
curl -X POST https://trbgmidway.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-new-password"}'
```

### 6.2 Test Frontend

1. **Visit:** https://trbgmidway.com
2. **Verify:**
   - HTTPS padlock shows
   - No console errors (F12)
   - Menu loads from backend
   - Images display correctly
   - Navigation works
   - Forms submit successfully

3. **Test Admin Panel:**
   - Visit: `/admin`
   - Login with credentials
   - Verify dashboard loads
   - Test CRUD operations

### 6.3 Test Forms

- [ ] Contact form submission
- [ ] Reservation form
- [ ] Job application (with optional resume/portfolio link)
- [ ] Newsletter signup

---

## Phase 7: Post-Deployment Checklist

### Security Verification
- [ ] `APP_DEBUG=false` in production `.env`
- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] Admin password changed from default
- [ ] `.env` file protected by `.htaccess`
- [ ] File permissions correct (755/644)
- [ ] SSL certificate active
- [ ] HTTPS redirect working

### Functionality Verification
- [ ] All API endpoints respond
- [ ] Frontend loads over HTTPS
- [ ] Admin login works
- [ ] JWT authentication functional
- [ ] Rate limiting active (check logs)
- [ ] File uploads work
- [ ] Menu items display
- [ ] Forms submit successfully

### Performance Verification
- [ ] Menu caching working (5 min TTL)
- [ ] Images optimized
- [ ] No console errors
- [ ] Mobile responsive

---

## Monitoring & Maintenance

### View Logs

**Via cPanel File Manager:**
1. Navigate to: `public_html/api/logs/`
2. Download: `app.log`
3. View with text editor

**Via FTP:**
```bash
# Download logs/app.log
# View locally
tail -f app.log
```

### Database Backups

**Automated (GoDaddy):**
- GoDaddy Deluxe includes automatic daily backups
- Access via: cPanel → Files → Backup Wizard

**Manual Backup:**
```bash
# Via phpMyAdmin: Export → SQL
# Or via MySQL command line:
mysqldump -h localhost -u username_dbuser -p username_thunder_road > backup.sql
```

### Update Deployment

**Backend Updates:**
1. Make changes locally in `backend/`
2. Test with `php -S localhost:5001 router.php`
3. Commit and push to GitHub: `git add . && git commit -m "..." && git push`
4. If composer dependencies changed: run `composer install` locally
5. Upload **only changed files** via FTP/cPanel (compare timestamps)
6. If dependencies changed: upload new `vendor/` folder or run `composer install` on server
7. Check logs for errors: `tail -f public_html/api/logs/app.log`

**Important Notes:**
- `.env` file should **never** be in git — edit it directly on server if needed
- `vendor/` is not tracked in git — must be generated via `composer install`
- `uploads/`, `cache/`, `logs/` are gitignored — preserve them on server during updates

**Frontend Updates:**
1. Make changes locally in `frontend/src/`
2. Test with `npm start`
3. Build: `npm run build`
4. Commit and push to GitHub
5. Upload new `build/` contents to `public_html/` (replace existing files)
6. Clear browser cache and test (Cmd+Shift+R or Ctrl+Shift+F5)

---

## Troubleshooting

### Issue: 500 Internal Server Error

**Solution:**
- Check `logs/app.log` via FTP
- Verify `.htaccess` uploaded correctly
- Check file permissions (755/644)
- Verify `.env` exists and is readable

### Issue: Database Connection Failed

**Solution:**
- Verify credentials in `.env`
- Test connection in phpMyAdmin
- Confirm database exists
- Check DB_HOST is `localhost`

### Issue: CORS Errors

**Solution:**
- Verify `FRONTEND_URL` in `.env` matches domain exactly
- Check both `www` and non-`www` variants included
- No trailing slashes in URLs

### Issue: JWT Token Issues

**Solution:**
- Regenerate `JWT_SECRET` with openssl
- Clear browser localStorage
- Verify token in Authorization header
- Check `JWT_EXPIRY` setting

---

## Cost Breakdown

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| **GoDaddy Deluxe** | Existing Plan | $8/month |
| **Backend Hosting** | Included | $0 |
| **MySQL Database** | Included | $0 |
| **SSL Certificate** | Included | $0 |
| **Total** | | **$8/month** |

**Savings:** $7/month ($84/year) compared to Node.js on Render/Railway

---

## Quick Reference Commands

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate bcrypt password
php -r "echo password_hash('password', PASSWORD_BCRYPT, ['cost' => 10]);"

# Build frontend
cd frontend && npm run build

# Test API locally
cd backend && php -S localhost:5001 router.php

# Backup database
mysqldump -h localhost -u user -p database > backup.sql

# Import database
mysql -h localhost -u user -p database < backup.sql
```

---

## File Structure on GoDaddy

```
public_html/
├── .htaccess              # React Router config
├── index.html             # Frontend entry
├── static/                # Frontend assets
├── favicon.ico
├── manifest.json
├── robots.txt
└── api/                   # PHP Backend
    ├── .htaccess          # API routing
    ├── .env               # Configuration (protected)
    ├── index.php          # API entry point
    ├── router.php         # Dev router (not used in prod)
    ├── middleware/
    ├── routes/
    ├── utils/
    ├── uploads/           # User uploads
    ├── cache/             # Menu cache
    └── logs/              # Application logs
```

---

## November 22, 2025 - Pending Updates

**Status:** 5 commits ready to deploy (tested locally, not yet on production)

### What Changed
1. **Menu Image ID Fix** - Menu categories properly preserve menu images when edited
2. **Rate Limiting Removed** - Admin endpoints no longer rate limited (JWT auth sufficient)
3. **Smart Column Layout** - Category descriptions AND item descriptions support pipe-separated columns
4. **Image Preservation** - Backend correctly preserves images when fields not provided
5. **PHP Backend Parity** - PHP backend now fully replaces the legacy Node implementation (all functionality ported)

### Quick Update Steps (15-20 minutes)

#### 1. Backup Production (5 min)
```bash
# Via cPanel:
# 1. Navigate to public_html/api/ → Compress → Download .zip
# 2. phpMyAdmin → Export database → Save .sql
```

#### 2. Build & Upload (10 min)
```bash
# Local terminal:
cd frontend && npm run build

# Via cPanel File Manager:
# 1. Upload backend/ files to public_html/api/ (exclude .env, uploads/, cache/, logs/)
# 2. Upload frontend/build/ files to public_html/ (overwrite existing)
```

#### 3. Verify (5 min)
```bash
# Browser tests:
https://trbgmidway.com/api/health
https://trbgmidway.com/
https://trbgmidway.com/admin
```

**Important Notes:**
- ✅ No database changes required (all schema already up to date)
- ✅ Backward compatible (old frontend works with new backend)
- ✅ Production `.env` and `uploads/` stay untouched
- ✅ Admin password unchanged

For detailed rollback plan and troubleshooting, see commit history or contact developer.

---

## Additional Resources

- **PHP Backend README:** `/backend/README.md`
- **Security Audit:** `/AUDITS_CONSOLIDATION.md`
- **GoDaddy Support:** 480-505-8877 (24/7)
- **cPanel Guide:** https://www.godaddy.com/help/cpanel

---

*Deployment Guide for Thunder Road Bar & Grill*  
*Platform: GoDaddy Deluxe Hosting*  
*Stack: PHP 7.4+, MySQL 5.7+, Apache 2.4+, React*  
*Total Cost: $8/month (saves $84/year)*
