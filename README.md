# Thunder Road Bar & Grill

Complete restaurant management system with public website and admin panel.

**Stack:** React 18 + PHP REST API + MySQL | **Hosting:** GoDaddy Deluxe (Apache + PHP)

## Features

**Public Website:** Menu, online reservations, about page, contact form  
**Admin Panel:** Dashboard, inbox, menu/reservations/jobs management, media library, settings

## Documentation

- **Quick Start:** See setup instructions below
- **Deployment:** `DEPLOYMENT.md` - Production deployment guide
- **Security & Quality:** `AUDITS_CONSOLIDATION.md` - Security, accessibility, and SEO audits
- **API Reference:** `php-backend/README.md` - Complete API documentation
- **Developer Guides:** `docs/` - Architecture, testing, styling, contributing

## Setup Instructions

### 1. Database Setup

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Open `database/schema.sql`
4. Execute the entire script
5. Verify tables were created

### 2. Backend Setup

```bash
cd php-backend

# Install composer dependencies
composer install

# Create .env from example
cp .env.example .env

# Edit .env and set your MySQL credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=thunder_road

# Start PHP dev server
php -S localhost:5001 router.php
```

Server runs on: `http://localhost:5001`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Website opens at: `http://localhost:3000`

## Admin Access

Default credentials (change immediately in production):
- Username: `admin`
- Password: Set in database during schema import

Click "Admin" in the navbar to access the admin panel.

> **⚠️ Security Warning**: Before deploying to production:
> 1. Change the admin password via the Admin Panel → Password Change
> 2. Set a secure `JWT_SECRET` in `.env` (generate with: `openssl rand -base64 32`)
> 3. Ensure `APP_ENV=production` and `APP_DEBUG=false` in production `.env`
> 4. Never commit `.env` files to version control

## Project Structure

```
thunder-road-bar-and-grill-react/
├── php-backend/      # Primary PHP REST API (production)
├── backend/          # Secondary Node.js API (alternative)
├── frontend/         # React SPA
│   ├── src/          # Application source
│   └── build/        # Production build
├── database/         # SQL schemas and migrations
├── docs/             # Developer documentation
└── DEPLOYMENT.md     # Production deployment guide
```

## Development Commands

```bash
# Frontend development
cd frontend
npm start              # Dev server (port 3000)
npm run build          # Production build
npm test               # Run tests
npm run lint           # ESLint
npm run lint:css       # Stylelint

# Backend development
cd php-backend
php -S localhost:5001 router.php    # PHP dev server
composer install                     # Install dependencies
```

## API Documentation

Key endpoints:

**Public APIs:**
- `GET /api/health` - Health check
- `GET /api/menu` - Get menu with categories
- `GET /api/job-positions/public` - Get open job positions
- `POST /api/reservations` - Create reservation
- `POST /api/jobs/apply` - Submit job application
- `POST /api/contact` - Submit contact message
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `GET /api/site-settings` - Get site settings
- `GET /api/about` - Get about content
- `GET /api/business-hours` - Get business hours

**Admin APIs (require JWT token):**
- `POST /api/login` - Admin login
- `PUT /api/user/password` - Change admin password
- `GET /api/reservations` - Get all reservations
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Delete reservation
- `POST /api/job-positions` - Create job position
- `PUT /api/job-positions/:id` - Update job position
- `DELETE /api/job-positions/:id` - Delete job position
- `POST /api/media` - Upload media file
- `PUT /api/site-settings` - Update site settings
- `GET /api/newsletter/subscribers` - Get subscribers

See `php-backend/README.md` for complete API documentation.



---

**Last updated:** November 22, 2025
