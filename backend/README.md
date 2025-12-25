# Thunder Road Bar & Grill - PHP Backend API

A lightweight, production-ready PHP REST API backend for the Thunder Road Bar & Grill website, optimized for GoDaddy Deluxe hosting.

## Overview

This PHP backend provides a complete RESTful API for managing the restaurant's website, including menu items, reservations, job applications, contact messages, and site settings. It replaces the previous Node.js backend, reducing hosting costs by $7/month while maintaining full functionality.

## Key Features

- ✅ **RESTful API** - Clean URL routing with parameterized endpoints
- ✅ **JWT Authentication** - Secure admin access with bcrypt password hashing (cost factor 10)
- ✅ **Rate Limiting** - Protection against brute force and abuse (5/15min login, 100/min forms, 300/min global)
- ✅ **CORS Middleware** - Configurable origin whitelist for cross-origin requests
- ✅ **Input Validation** - Comprehensive request validation with detailed error messages
- ✅ **Caching** - File-based menu caching (5 minute TTL, configurable)
- ✅ **Error Handling** - Centralized error handling with PSR-compliant logging
- ✅ **SQL Injection Protection** - 100% coverage via PDO prepared statements
- ✅ **Security Headers** - X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy

## Prerequisites

- **PHP:** 7.4 or higher
- **MySQL:** 5.7 or higher
- **Hosting:** GoDaddy Deluxe plan (or Apache server with mod_rewrite)
- **Extensions:** PDO, pdo_mysql, mbstring, json

## 🏗️ Architecture

```
backend/
├── index.php              # Main entry point (router)
├── .htaccess             # Apache URL rewriting
├── .env.example          # Environment configuration template
├── utils/                # Core utilities
│   ├── Config.php        # Environment variable loader
│   ├── Database.php      # PDO database wrapper
│   ├── Logger.php        # Logging utility
│   ├── Router.php        # Simple URL router
│   ├── JWT.php           # JWT encode/decode
│   └── Validator.php     # Request validation
├── middleware/           # HTTP middleware
│   ├── CorsMiddleware.php       # CORS handling
│   ├── AdminAuthMiddleware.php  # JWT verification
│   ├── ErrorHandler.php         # Error handling
│   └── RateLimitMiddleware.php  # Rate limiting
├── routes/               # Route handlers
│   ├── auth.php          # Login endpoints
│   ├── menu.php          # Menu CRUD
│   └── (more routes...)
└── uploads/              # User uploads directory
```

## Quick Start (Development)

### Local Development Setup

1. **Start the development server:**
   ```bash
   cd backend
   ./start-dev.sh
   # or manually:
   php -S localhost:5001 router.php
   ```

2. **Configure environment (first time only):**
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

3. **Import database schema:**
   ```bash
   mysql -u root -p thunder_road < ../database/schema.sql
   ```

4. **Test the API:**
   ```bash
   # Health check
   curl http://localhost:5001/api/health
   
   # Run full test suite
   ./test-api.sh
   ```

5. **Start the frontend:**
   ```bash
   cd ../frontend
   npm start
   # Visit http://localhost:3000
   ```

### Default Credentials

- **Username:** `admin`
- **Password:** `admin123`
- ⚠️ **MUST change in production!**

## Configuration

### Environment Variables

Create `.env` from `.env.example` and configure:

```ini
# Environment
APP_ENV=production              # development | production
APP_DEBUG=false                 # NEVER true in production

# Database (from GoDaddy cPanel → MySQL)
DB_HOST=localhost               # Usually localhost on GoDaddy
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=thunder_road

# Security
JWT_SECRET=<generate-with-openssl>   # openssl rand -base64 32
JWT_EXPIRY=86400                      # 24 hours

# CORS
FRONTEND_URL=https://trbgmidway.com,https://www.trbgmiddy.com

# Rate Limiting (file-based)
RATE_LIMIT_GLOBAL=300           # Requests per minute
RATE_LIMIT_LOGIN=5              # Login attempts per 15 min

# Caching
CACHE_MENU=true                 # Enable menu cache
CACHE_MENU_TTL=300              # Cache TTL (seconds)
```

### Security Features

- **JWT Authentication:** HMAC SHA256 with bcrypt password hashing (cost factor 10)
- **Rate Limiting:** File-based - Login (5/15min), Forms (100/min), Global (300/min)
- **SQL Injection Protection:** 100% via PDO prepared statements
- **CORS:** Origin whitelist enforcement
- **Security Headers:** X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy
- **.htaccess:** Apache configuration with clean URLs and security hardening

## Media Pipeline (MMH Spec)

- **Upload validation:** `/api/media` accepts JPEG/PNG/GIF/WebP images up to `IMAGE_UPLOAD_MAX_BYTES` (default 8 MB). MIME types are verified by magic bytes + `getimagesize`.
- **Variant profiles:** Hero images generate `[1600, 3200, 4800]` widths, menu images `[1440, 2880, 4320]`, and other categories default to `[480, 768, 1024, 1600]`. Logos are static assets served from `/public/assets/logo`. Override sizes via the `RESPONSIVE_IMAGE_WIDTH_PROFILES` JSON env var.
- **Derivatives:** Every upload writes optimized JPEG/PNG plus WebP variants, srcset strings, and a manifest (`/uploads/manifests/{basename}.json`). Originals stay in `/uploads/`.
- **Directory layout:** `backend/uploads/` contains immutable structure (`incoming/`, `variants/optimized`, `variants/webp`, `manifests/`, etc.) protected by `.htaccess`. Keep this directory writable and excluded from deployments.
- **Responsive responses:** `GET /api/media` and `GET /api/settings` return `responsive_variants`, `image_variants`, `optimized_srcset`, `webp_srcset`, and `fallback_original` so the React frontend can render `<picture>` tags deterministically.
- **CLI helpers:**  
  1. `backend/scripts/rehydrate_media_variants.php` – regenerate manifests/variants for legacy rows.  
  2. `backend/scripts/remove_resume_media.php` – deletes deprecated `category=resume` uploads and clears job application links.
- **Housekeeping:** When deleting media the API removes the original, every variant, and the manifest to keep `uploads/` tidy. Use the scripts after large imports or migrations to ensure consistency.

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/login` | None | Admin login |
| POST | `/api/dev-signin` | None | Dev cookie (dev only) |

**Login Request:**
```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Login Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Menu (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/menu` | None | Get active menu categories with items |

### Menu (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/menu/admin` | JWT | Get all categories with items |
| GET | `/api/menu/categories` | None | Get all categories |
| GET | `/api/menu/categories/:id/items` | None | Get items by category |
| POST | `/api/menu/categories` | JWT | Create category |
| PUT | `/api/menu/categories/:id` | JWT | Update category |
| DELETE | `/api/menu/categories/:id` | JWT | Delete category |
| POST | `/api/menu/items` | JWT | Create menu item |
| PUT | `/api/menu/items/:id` | JWT | Update menu item |
| DELETE | `/api/menu/items/:id` | JWT | Delete menu item |

**Admin Authentication:**
All admin endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```





## Deployment

### Prerequisites

- **Hosting:** GoDaddy Deluxe plan (or equivalent)
- **PHP Version:** 7.4 or higher
- **MySQL:** 5.7 or higher
- **Access:** FTP credentials and cPanel access

### Production Deployment Checklist

#### 1. Environment Configuration

```bash
# Copy and configure .env
cp .env.example .env
```

**Required settings:**
```ini
APP_ENV=production
APP_DEBUG=false
JWT_SECRET=<generate-with: openssl rand -base64 32>
DB_HOST=localhost
DB_USER=<godaddy-mysql-user>
DB_PASSWORD=<godaddy-mysql-password>
DB_NAME=thunder_road
FRONTEND_URL=https://trbgmidway.com
```

#### 2. Database Setup

1. **Create database in GoDaddy cPanel:**
   - Navigate to: cPanel → MySQL Databases
   - Create database: `thunder_road`
   - Create user and grant all privileges

2. **Import schema:**
   - Navigate to: cPanel → phpMyAdmin
   - Select `thunder_road` database
   - Import → Select `/database/schema.sql`

3. **Change default admin password:**
   ```sql
   UPDATE users 
   SET password_hash = '$2y$10$<your-bcrypt-hash>' 
   WHERE username = 'admin';
   ```
   Generate hash with: `php -r "echo password_hash('your-new-password', PASSWORD_BCRYPT);"`

#### 3. File Upload

**Via FTP:**
1. Connect to GoDaddy FTP server
2. Upload `backend/*` to `public_html/api/`
3. Verify `.htaccess` and `.env` are uploaded

**Via cPanel File Manager:**
1. Navigate to: cPanel → File Manager
2. Go to `public_html/`
3. Create folder: `api/`
4. Upload all `backend` files

#### 4. File Permissions

Set via FTP client or cPanel File Manager:
```
Directories:    755
PHP files:      644
.env:           640 (or 644)
uploads/:       755 (writable)
cache/:         755 (writable)
logs/:          755 (writable)
```

#### 5. Frontend Deployment

```bash
# Build production frontend
cd frontend
npm run build

# Update API URL in build
# Verify frontend/.env.production has:
REACT_APP_API_BASE=https://trbgmidway.com/api
```

Upload `frontend/build/*` to `public_html/`

#### 6. Verification

```bash
# Test API health
curl https://trbgmidway.com/api/health

# Test public endpoints
curl https://trbgmidway.com/api/menu

# Test admin login
curl -X POST https://trbgmidway.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-new-password"}'

# Visit website
open https://trbgmidway.com
```

#### 7. Post-Deployment

- [ ] Verify all API endpoints respond correctly
- [ ] Test admin login and JWT authentication
- [ ] Verify rate limiting is active (check `logs/app.log`)
- [ ] Test file uploads work (check `uploads/` directory)
- [ ] Verify CORS allows frontend origin
- [ ] Monitor `logs/app.log` for errors
- [ ] Set `APP_DEBUG=false` (confirm)
- [ ] Remove `ALLOW_DEV_ADMIN_HEADER` from production `.env`

### Troubleshooting

**500 Internal Server Error:**
- Check `logs/app.log` via FTP or cPanel
- Verify `.htaccess` uploaded correctly
- Check file permissions (755/644)

**CORS Errors:**
- Verify `FRONTEND_URL` matches exact origin
- Check browser console for actual origin
- Ensure no trailing slashes in URLs

**Database Connection Failed:**
- Verify MySQL credentials in `.env`
- Test connection in phpMyAdmin
- Confirm database exists

**JWT Token Issues:**
- Regenerate `JWT_SECRET` with openssl
- Clear browser localStorage
- Verify token in Authorization header

---

**Platform:** GoDaddy Deluxe Hosting  
**Stack:** PHP 7.4+, MySQL 5.7+, Apache 2.4+  
**Cost Savings:** $7/month ($84/year) vs Node.js on Render
