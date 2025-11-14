# Thunder Road Bar & Grill - PHP Backend API

A lightweight PHP REST API backend for the Thunder Road Bar & Grill website, designed to run on GoDaddy Deluxe hosting with no external dependencies.

## 🎯 Why PHP?

- **Cost Effective**: Runs on your existing GoDaddy Deluxe plan ($8/month) - no additional hosting costs
- **GoDaddy Optimized**: Works perfectly with GoDaddy's Apache/PHP/MySQL stack
- **No External Services**: Everything on one server - no Render, Railway, or other services needed
- **Simple Deployment**: Just FTP upload - no build process or CLI tools required
- **Familiar Stack**: PHP + MySQL is well-supported and documented

## 📋 Features

- ✅ RESTful API with clean URL routing
- ✅ JWT authentication with bcrypt password hashing
- ✅ CORS middleware with configurable origins
- ✅ Rate limiting to prevent abuse
- ✅ File-based caching for menu data
- ✅ Centralized error handling
- ✅ Request validation
- ✅ PSR-compliant logging
- ✅ Database connection pooling (PDO)
- ✅ Development/production environment support

## 🏗️ Architecture

```
php-backend/
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

## 🚀 Quick Start

### 1. Copy Environment File

```bash
cd php-backend
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` and set your configuration:

```ini
# Environment
APP_ENV=production
APP_DEBUG=false

# Database
DB_HOST=localhost
DB_USER=your_godaddy_db_user
DB_PASSWORD=your_secure_password
DB_NAME=thunder_road

# Security
JWT_SECRET=<run: openssl rand -base64 32>
JWT_EXPIRY=86400

# CORS
FRONTEND_URL=https://trbgmidway.com,https://www.trbgmidway.com
```

### 3. Generate JWT Secret

```bash
# Generate a strong secret
openssl rand -base64 32

# Copy output to .env as JWT_SECRET
```

### 4. Upload to GoDaddy

**Via FTP:**
1. Connect to your GoDaddy FTP
2. Upload entire `php-backend/` folder to `public_html/api/`
3. Ensure `.htaccess` and `.env` are uploaded

**Via cPanel File Manager:**
1. Go to GoDaddy → cPanel → File Manager
2. Navigate to `public_html/`
3. Create `api/` folder
4. Upload all php-backend files

### 5. Set File Permissions

```bash
# Via cPanel or FTP client:
Directories: 755
PHP files: 644
.env file: 640 (or 644)
uploads/: 755 (writable)
cache/: 755 (writable)
logs/: 755 (writable)
```

### 6. Test API

```bash
# Health check
curl https://trbgmidway.com/api/health

# Expected:
# {"status":"OK","message":"Thunder Road API is running","timestamp":"..."}

# Test menu endpoint
curl https://trbgmidway.com/api/menu
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_ENV` | Yes | production | Environment (development/production) |
| `APP_DEBUG` | No | false | Enable debug mode (NEVER in production) |
| `FRONTEND_URL` | Yes | - | Comma-separated allowed origins |
| `DB_HOST` | Yes | localhost | MySQL host |
| `DB_USER` | Yes | root | MySQL user |
| `DB_PASSWORD` | Yes | - | MySQL password |
| `DB_NAME` | Yes | thunder_road | Database name |
| `DB_PORT` | No | 3306 | MySQL port |
| `JWT_SECRET` | Yes | - | JWT signing secret (MUST CHANGE!) |
| `JWT_EXPIRY` | No | 86400 | Token expiration (seconds) |
| `RATE_LIMIT_ENABLED` | No | true | Enable rate limiting |
| `RATE_LIMIT_GLOBAL` | No | 300 | Requests per minute |
| `RATE_LIMIT_LOGIN` | No | 5 | Login attempts per 15 min |
| `CACHE_MENU` | No | true | Enable menu caching |
| `CACHE_MENU_TTL` | No | 300 | Cache TTL (seconds) |
| `LOG_LEVEL` | No | info | Logging level (debug/info/warning/error) |

### GoDaddy-Specific Settings

**.htaccess** is configured for GoDaddy's Apache setup:
- Clean URLs via `mod_rewrite`
- Security headers
- PHP settings (upload limits, etc.)
- CORS fallback headers

**Database Connection:**
- Uses PDO with persistent connections (connection pooling)
- GoDaddy MySQL is on `localhost` by default
- Database credentials from cPanel → MySQL Databases

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

## 🔒 Security

### Production Checklist

- [x] `APP_ENV=production`
- [x] `APP_DEBUG=false`
- [x] Change `JWT_SECRET` to strong random value
- [x] Set secure `DB_PASSWORD`
- [x] Update `FRONTEND_URL` to actual domain(s)
- [x] Change default admin password in database
- [x] File permissions: 644 for PHP, 755 for directories
- [x] `.env` file protected by `.htaccess`
- [x] `ALLOW_DEV_ADMIN_HEADER=false` (or removed)

### Security Features

- **JWT Authentication**: Industry-standard token-based auth
- **Bcrypt Password Hashing**: Secure password storage (cost factor 10)
- **Rate Limiting**: Prevents brute force and abuse
- **CORS Protection**: Strict origin validation
- **Input Validation**: All inputs validated before processing
- **SQL Injection Prevention**: PDO prepared statements
- **XSS Protection**: HTML entity encoding
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, etc.
- **Error Hiding**: No sensitive data in production errors

## 🛠️ Development

### Local Development

1. **Setup Local Environment:**
   ```bash
   # Install PHP 7.4+ with MySQL extension
   brew install php mysql  # macOS
   
   # Start MySQL
   brew services start mysql
   
   # Create database
   mysql -u root -p
   CREATE DATABASE thunder_road;
   ```

2. **Configure Local .env:**
   ```ini
   APP_ENV=development
   APP_DEBUG=true
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   FRONTEND_URL=http://localhost:3000
   ALLOW_DEV_ADMIN_HEADER=true
   ```

3. **Run Local Server:**
   ```bash
   cd php-backend
   php -S localhost:5001
   
   # Test
   curl http://localhost:5001/api/health
   ```

### Adding New Routes

1. **Create route file in `routes/`:**
   ```php
   <?php
   // routes/settings.php
   require_once __DIR__ . '/../utils/Database.php';
   
   class SettingsRoutes {
       private $db;
       
       public function __construct() {
           $this->db = Database::getInstance();
       }
       
       public function getSiteSettings() {
           $settings = $this->db->fetchAll('SELECT * FROM site_settings');
           echo json_encode($settings);
       }
   }
   ```

2. **Register in `index.php`:**
   ```php
   require_once __DIR__ . '/routes/settings.php';
   $settingsRoutes = new SettingsRoutes();
   
   $router->get('/site-settings', function() use ($settingsRoutes) {
       $settingsRoutes->getSiteSettings();
   });
   ```

## 📊 Monitoring & Debugging

### Logs

Logs are stored in `logs/app.log`:

```bash
# View logs via cPanel File Manager or FTP
tail -f logs/app.log

# Log levels: debug, info, warning, error
# Controlled by LOG_LEVEL in .env
```

### Debug Mode

Enable in development only:
```ini
APP_DEBUG=true
LOG_LEVEL=debug
LOG_QUERIES=true  # Log all SQL queries
```

## 🔄 Database Migrations

PHP backend uses the same MySQL database as Node.js backend.

**Schema location:** `/database/schema.sql`

**To apply schema:**
```bash
# Via MySQL command line
mysql -u root -p thunder_road < database/schema.sql

# Or via GoDaddy cPanel → phpMyAdmin
# Import → schema.sql
```

## 🚀 Deployment

### Deploy to GoDaddy

1. **Build Frontend** (if not done already):
   ```bash
   cd frontend
   npm run build
   ```

2. **Upload PHP Backend**:
   ```bash
   # Via FTP or cPanel File Manager
   # Upload php-backend/* to public_html/api/
   ```

3. **Upload Frontend**:
   ```bash
   # Upload frontend/build/* to public_html/
   ```

4. **Update Frontend API URL**:
   ```bash
   # frontend/.env.production
   REACT_APP_API_BASE=https://trbgmiddy.com/api
   ```

5. **Test Deployment**:
   ```bash
   curl https://trbgmidway.com/api/health
   curl https://trbgmidway.com/api/menu
   ```

## 💡 Tips & Tricks

### Performance

- Menu caching is enabled by default (5 min TTL)
- Use PDO persistent connections (enabled)
- Configure Apache `KeepAlive` for better performance
- Consider enabling PHP OpCache in GoDaddy cPanel

### Troubleshooting

**500 Internal Server Error:**
- Check `logs/app.log` for details
- Verify `.htaccess` is uploaded
- Check file permissions (755/644)
- Enable `APP_DEBUG=true` temporarily

**CORS Errors:**
- Verify `FRONTEND_URL` in `.env`
- Check browser console for exact origin
- Ensure `.htaccess` is not overriding CORS headers

**Database Connection Failed:**
- Verify credentials in `.env`
- Check GoDaddy cPanel → MySQL Databases
- Ensure database exists
- Test connection with phpMyAdmin

**JWT Token Issues:**
- Verify `JWT_SECRET` is set
- Check token expiration (JWT_EXPIRY)
- Ensure `Authorization` header is sent
- Test with dev signin in development

## 📚 Additional Resources

- [GoDaddy PHP Documentation](https://www.godaddy.com/help/php-30210)
- [PDO Documentation](https://www.php.net/manual/en/book.pdo.php)
- [JWT Introduction](https://jwt.io/introduction)
- [Apache mod_rewrite Guide](https://httpd.apache.org/docs/current/mod/mod_rewrite.html)

## 🆘 Support

For issues or questions:
1. Check `logs/app.log` for error details
2. Review this README for configuration
3. Test with `APP_DEBUG=true` in development
4. Verify all environment variables are set

---

**Built for:** Thunder Road Bar & Grill  
**Platform:** GoDaddy Deluxe Hosting  
**Stack:** PHP 7.4+, MySQL 5.7+, Apache 2.4+  
**Cost:** $8/month (included in GoDaddy plan)
