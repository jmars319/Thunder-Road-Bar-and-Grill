# Thunder Road Bar & Grill — Documentation

All canonical project documentation lives in the `docs/` folder.

Start here: `docs/INDEX.md`

This repository intentionally keeps canonical docs under `docs/` so internal links and guides are grouped together. If you expected a top-level README, follow the link above.

Last updated: 2025-10-25
# Thunder Road Bar and Grill

Purpose
- Monorepo for the Thunder Road public website and admin panel. This README
  contains high-level setup steps, API endpoint pointers, and a quick runbook
  for local development.

Complete restaurant management system with public website and admin panel.

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

- Frontend: React 18, Tailwind CSS, Lucide React
- Backend: Node.js, Express
- Database: MySQL

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
cd backend
npm install
```

Edit `backend/.env` and set your MySQL password:

```
DB_PASSWORD=your_actual_password
```

Start backend server:

```bash
npm start
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

- Username: `admin` (placeholder)
- Password: `admin123` (placeholder)

Click "Admin" in the navbar to access the admin panel.

## Project Structure

```
thunder-road/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── uploads/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── pages/
│   │   └── components/
│   └── package.json
└── database/
    └── schema.sql
```

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

## API Endpoints

- `POST /api/login` - Admin login
- `GET /api/menu` - Get menu with categories
- `POST /api/reservations` - Create reservation
- `GET /api/reservations` - Get all reservations (admin)
- `POST /api/jobs` - Submit job application
- `POST /api/media/upload` - Upload media file (admin)
- `GET /api/site-settings` - Get site settings
- `PUT /api/site-settings` - Update site settings (admin)
- `GET /api/about` - Get about content
- `GET /api/business-hours` - Get business hours
- `GET /api/newsletter/subscribers` - Get subscribers (admin)
- `POST /api/contact` - Submit contact message

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
