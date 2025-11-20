# Thunder Road Bar & Grill

Complete restaurant management system with public website and admin panel, deployed on GoDaddy Deluxe hosting with PHP backend and React frontend.

## Features

- Public Website
  - Menu display with categories
  - Online reservations
  - About section with map
  - Contact form

- Admin Panel
  - Dashboard with metrics
  - Inbox for messages
  - Menu management
  - Reservation management
  - Job application reviews
  - Media library
  - Business settings
  - Newsletter management

## Technology Stack

- **Frontend:** React 18, Tailwind CSS, Lucide React icons
- **Backend:** PHP 7.4+ REST API with custom router
- **Database:** MySQL 5.7+ (MariaDB compatible)
- **Hosting:** GoDaddy Deluxe (Apache + PHP + MySQL)
- **Dependencies:** Composer (PHPMailer/SendGrid for emails)

## Documentation (canonical)

- Developer guide: `docs/notes/DEVELOPERS.md` — onboarding, architecture notes, and tips for making changes to the frontend and admin modules.
- Developer notes: `docs/notes/DEVELOPER_NOTES.md` — repository housekeeping and special-case notes about nested package folders.
- Testing: `docs/guides/TESTING.md` — how to run frontend unit tests and the backend integration script, plus aggregated logs in `test-logs/`.
- Styling: `docs/guides/STYLING.md` — design-token philosophy, migration checklist, verification commands, and CI recommendations (self-contained).
- Contributor docs: `docs/contributing/CONTRIBUTING.md` — how to contribute, commit message style, and PR checklist.
- Frontend developer guide: `docs/frontend/DEVELOPER-GUIDE.md` — quick-start, linting, tests, and Tailwind notes.
- Linting guidance: `docs/guides/LINTING.md` — ESLint and Stylelint instructions and Tailwind handling.

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
├── php-backend/           # PHP REST API
│   ├── index.php         # Main entry point
│   ├── router.php        # Dev server router
│   ├── routes/           # API route handlers
│   ├── middleware/       # Auth, CORS, rate limiting
│   ├── utils/            # Database, JWT, validators
│   ├── uploads/          # User uploaded files
│   ├── cache/            # Rate limit & menu cache
│   ├── logs/             # Application logs
│   └── composer.json     # PHP dependencies
├── frontend/             # React SPA
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   └── lib/          # Utilities and helpers
│   ├── build/            # Production build output
│   └── package.json
├── database/             # SQL schemas and migrations
│   └── schema.sql        # Database structure
├── docs/                 # Project documentation
├── backend/              # Legacy Node.js backend (deprecated)
└── DEPLOYMENT.md         # Production deployment guide
```

> **Note:** The `backend/` folder contains a legacy Node.js backend that has been replaced by `php-backend/`. It's kept for reference but is no longer used in production.

## Developer quick links

Run these from the repository root when working locally:

```bash
# Frontend
cd frontend
npm install
npm run lint        # JS lint
npm run lint:css    # CSS lint
npm start           # start dev server

# Run unit tests (CI style)
CI=true npm test -- --watchAll=false --runInBand
```

If you plan to contribute, see `docs/contributing/CONTRIBUTING.md` for the PR checklist and commit message conventions.

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

## Customizing for Other Businesses

This codebase is designed to be easily copied and customized:

1. Copy the entire project folder
2. Rename the folder (e.g., `bow-wows-spa`)
3. Update `database/schema.sql` with new business name
4. Run schema in MySQL Workbench
5. Update site settings in admin panel
6. Customize menu/services as needed

## Support

For issues or questions, contact: info@thunderroad.com

Last updated: 2025-10-21 — documentation sweep: clarified developer notes and added maintenance guidance.
