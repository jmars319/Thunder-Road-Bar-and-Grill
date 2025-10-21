## Notes about repository layout and generated assets

- Public social and PWA images are committed into `frontend/public/og/` and `frontend/public/splash/` for a zero-build deployment. These images are large and tracked deliberately so production builds don't need to generate them.
- A set of small helper scripts lives in `frontend/scripts/` to regenerate social images, iOS splash images and to build a multi-resolution `favicon.ico`.
- CI includes a lightweight asset-check workflow (`.github/workflows/public-assets-check.yml`) which runs `node ./scripts/check_public_assets.js` in `frontend` to verify referenced public assets exist and that certain images match filename-encoded dimensions.

If you would rather generate these images during CI or use a CDN for large assets, see `frontend/README.md` for suggested steps.
 
Last updated: 2025-10-21 — documentation sweep: clarified developer notes and added maintenance guidance.
# Thunder Road Bar and Grill

Purpose:
- Monorepo for the Thunder Road public website and admin panel. This README
  contains high-level setup steps, API endpoint pointers, and a quick runbook
  for local development.

Complete restaurant management system with public website and admin panel.

## Features

- **Public Website**
  - Menu display with categories
  - Online reservations
  - About section with map
  - Contact form
  
- **Admin Panel**
  - Dashboard with metrics
  - Inbox for messages
  - Menu management
  - Reservation management
  - Job application reviews
  - Media library
  - Business settings
  - Newsletter management

## Technology Stack

- **Frontend:** React 18, Tailwind CSS, Lucide React
- **Backend:** Node.js, Express
- **Database:** MySQL

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

- Username: `admin`
- Password: `admin123`

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
