# Thunder Road Bar & Grill

Complete restaurant management system with public website and admin panel.

**Stack:** React 18 + PHP REST API + MySQL | **Hosting:** GoDaddy Deluxe (Apache + PHP)

## Quick Links

- `docs/INDEX.md` – Documentation hub & onboarding
- `docs/DEPLOYMENT.md` – Production deployment guide (GoDaddy / zip upload)
- `docs/TRBG-Image-Pipeline-Spec.md` – Image upload + variant pipeline (authoritative)
- `docs/AUDITS_CONSOLIDATION.md` – Security, accessibility, SEO audits
- `docs/Generic-Scripts-Reference.md` – Dev/deploy script behavior
- `docs/CHANGELOG.md` – Human-readable change log

## Features

**Public Website:** Menu, reservations, about, contact

**Admin Panel:** Dashboard, inbox, menu/reservations/jobs management, media library, settings

## Local Development

### Preferred workflow (scripts)

```bash
# repo root
bash scripts/dev-start.sh     # start PHP API + CRA frontend
bash scripts/dev-status.sh    # check PID/port/health
bash scripts/dev-restart.sh   # restart both services
bash scripts/dev-stop.sh      # stop both safely
```

- Health checks hit `http://localhost:5001/api/health`.
- Logs/PIDs live in `.dev/`. Override defaults by copying `scripts/dev-config.example.sh` to `.dev/dev-config.sh`.

### Manual backend setup

```bash
cd backend
composer install
cp .env.example .env   # configure DB + SendGrid
php -S localhost:5001 router.php
```

### Manual frontend setup

```bash
cd frontend
npm install
npm start
```

### Database bootstrap

1. Run `database/schema.sql` against your MySQL server.
2. Update `backend/.env` with DB credentials.
3. Seed any initial menu/data as needed.

## Admin Access

- Default username: `admin`
- Password: set manually in the database after import

> **Production hardening**
> 1. Change the admin password via Admin Panel → Password.
> 2. Generate a strong `JWT_SECRET` (`openssl rand -base64 32`).
> 3. Verify `APP_ENV=production`, `APP_DEBUG=false`, `FORCE_HTTPS=true`.
> 4. Never commit `.env` files.

## Email Delivery Safety

- Real SendGrid delivery only occurs when **all** are true: `APP_ENV=production`, `SEND_EMAILS=true`, non-empty `SENDGRID_API_KEY` (`backend/utils/Email.php:13-188`). Otherwise `[email:skip]` logs fire and the call short-circuits.
- `backend/.env.production.example` defaults `SEND_EMAILS=false`; flip it only after smoke tests pass.
- Reservation alerts use `STAFF_EMAIL_TO` + `EMAIL_FROM_NOTIFICATIONS`; job alerts use `ALERTS_EMAIL_TO` + `EMAIL_FROM_ALERTS`.

## Deployment

1. Build archives: `bash scripts/make-deploy-zips.sh`
2. Validate contents: `bash scripts/check-deploy-zips.sh`
3. Follow `docs/DEPLOYMENT.md` for GoDaddy upload, `.env` provisioning, and DB prep.

## Project Structure

```
thunder-road-bar-and-grill-react/
├── backend/          # PHP API (composer, router.php, scripts)
├── frontend/         # React SPA (CRA)
├── database/         # SQL schema + migrations
├── docs/             # All documentation (guides, changelog, specs)
└── scripts/          # Dev/deploy helpers
```

## API Overview

Public endpoints include:
- `GET /api/health`
- `GET /api/menu`
- `GET /api/job-positions/public`
- `POST /api/reservations`
- `POST /api/jobs/apply`
- `POST /api/contact`
- `POST /api/newsletter/subscribe`
- `GET /api/settings`, `/api/site-settings`, `/api/about`, `/api/business-hours`

Admin (JWT) endpoints cover authentication, menu CRUD, media uploads, and site settings (`backend/routes/*.php`). See `docs/backend/README.md` for full details.

## Media Pipeline & Migration

- Uploads flow through the MMH-style pipeline documented in `docs/TRBG-Image-Pipeline-Spec.md` (1x/2x/3x raster + WebP variants, manifest JSON per original).
- Frontend consumes manifests via `frontend/src/utils/imageVariants.js` and `<ResponsiveImage />` wrappers.
- Legacy rows: run `php backend/scripts/rehydrate_media_variants.php` to backfill manifests/srcsets; run `php backend/scripts/remove_resume_media.php` once to purge deprecated resume uploads.
- Storage layout lives under `backend/uploads/` (`originals/`, `optimized/`, `webp/`, `variants/`, `manifests/`).

## Scripts Reference

- Dev orchestration: `scripts/dev-start.sh`, `dev-stop.sh`, `dev-restart.sh`, `dev-status.sh`, `dev-verify.sh`
- Backend only: `scripts/dev-backend-start.sh`, `dev-backend-stop.sh`, `dev-backend-restart.sh`
- Frontend only: `scripts/dev-frontend-start.sh`, `dev-frontend-stop.sh`, `dev-frontend-restart.sh`
- Deployment: `scripts/make-deploy-zips.sh`, `scripts/check-deploy-zips.sh`
- Template overrides: `scripts/dev-config.example.sh` → `.dev/dev-config.sh`

See `docs/Generic-Scripts-Reference.md` for behavior, dependencies, and failure modes.

## Testing

- Frontend: `cd frontend && npm test` or `npm run test:ci` (Jest).
- Backend smoke tests: `bash backend/test-api.sh` (hits `/api/health`, menu, login, CORS, admin endpoints).
- Full stack: `bash scripts/dev-verify.sh` to start, health-check, restart, and stop both services.

## Change History

Recent documentation and operational updates live in `docs/CHANGELOG.md`.
