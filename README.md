# Thunder Road Bar & Grill

## Repository About

- **Description:** Restaurant and bar website with an admin management system for Thunder Road Bar & Grill in Midway, NC, covering public menu/reservation/job/contact flows, editable site content, media uploads, SendGrid notifications, branded error handling, and a PHP/MySQL backend built for GoDaddy shared hosting.
- **Live URL:** https://trbgmidway.com/
- **Suggested GitHub topics:** `restaurant`, `bar-and-grill`, `menu-management`, `reservations`, `job-applications`, `react`, `create-react-app`, `php`, `mysql`, `admin-dashboard`, `sendgrid`, `local-business`, `seo`

Production restaurant website and management system with a public site, admin panel, PHP API, and MySQL persistence.

**Stack:** React 18 + PHP REST API + MySQL | **Hosting:** GoDaddy Deluxe (Apache + PHP)

## Quick Links

- `docs/INDEX.md` – Documentation hub & onboarding
- `docs/DEPLOYMENT.md` – Production deployment guide (GoDaddy / zip upload)
- `docs/TRBG-Image-Pipeline-Spec.md` – Image upload + variant pipeline (authoritative)
- `docs/AUDITS_CONSOLIDATION.md` – Security, accessibility, SEO audits
- `docs/Generic-Scripts-Reference.md` – Dev/deploy script behavior
- `docs/CHANGELOG.md` – Human-readable change log
- `docs/richtext-editor.md` – Rich text editor invariants & smoke tests
- `docs/worst-display-checklist.md` – Typography/contrast guardrails for low-quality displays
- `docs/error-envelope.md` – Standard API error payload contract

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

### Asset verification

- `bash scripts/verify-public-assets.sh` – checks OG/favicons exist under `frontend/public`, ensures `index.html` + `manifest.json` reference the canonical filenames, and fails if any legacy `www` domain references sneak back in. Run before commits or deploys.

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

### Rich Text Editor Invariants
The admin/menu editor uses a tightly constrained rich text workflow (uncontrolled while focused, sanitize-on-blur, selection-preserving toolbars, UTF-8 only). See [`docs/richtext-editor.md`](docs/richtext-editor.md) for the full invariants, paste normalization rules, sanitization contract, and manual smoke checklist. Always render stored rich text via sanitized `dangerouslySetInnerHTML`; never output it via `textContent`/`innerText`.

## Admin Access

- Default username: `admin`
- Password: set manually in the database after import

> **Production hardening**
> 1. Change the admin password via Admin Panel → Password.
> 2. Generate a strong `JWT_SECRET` (`openssl rand -base64 32`).
> 3. Verify `APP_ENV=production`, `APP_DEBUG=false`, `FORCE_HTTPS=true`.
> 4. Never commit `.env` files.

## Email Delivery Safety

> ⚠️ **Sender verification**: both `no-reply@trbgmidway.com` and `alerts@trbgmidway.com` must be domain-authenticated inside SendGrid (verified senders + DNS records). Unverified senders may be rejected or flagged as spoofing.
>
> ⚠️ **Throttle storage**: alert throttling writes to `backend/cache/error-alerts/*.cache`. Remove those files to reset the throttle window (e.g., between staging tests). This folder is not web-served and is writable on GoDaddy.

- All email goes through SendGrid via `backend/utils/Emailer.php`.
  - Operational notifications (`/contact`, `/jobs`, `/reservations`) ⇒ TO `OPERATIONS_EMAIL` (default `thundergrillmidway@gmail.com`) and FROM `MAIL_FROM` (`no-reply@trbgmidway.com`). Reply-To is set to the submitter’s email only if it passes validation.
  - 5xx alerts ⇒ TO `ALERT_TO` (`support@jamarq.digital`) and FROM `ALERT_FROM` (`alerts@trbgmidway.com`). Alerts are throttled via `ALERT_THROTTLE_MINUTES` and never fire for 4xx responses.
- Required env vars: `SEND_EMAILS`, `SENDGRID_API_KEY`, `SERVICE_NAME`, `MAIL_FROM`, `OPERATIONS_EMAIL`, `SUPPORT_EMAIL`, `ALERT_FROM`, `ALERT_TO`, `ALERT_THROTTLE_MINUTES`. See `backend/.env.production.example`.
- Senders are hard-locked to `@trbgmidway.com`; never expose user-controlled from addresses.
- Real SendGrid traffic only happens when `APP_ENV=production`, `SEND_EMAILS=true`, and a valid API key is present. In dev/staging the payload is skipped and mirrored to `backend/cache/email-previews.log`.
- Admin test endpoint: `POST /api/admin/test-email` (JWT required, no dev bypass). Body `{ "type": "ops" }` or `{ "type": "alert" }`. The endpoint is disabled in production unless `ALLOW_PROD_TEST_EMAIL=true`. Responds with `{ success:true, requestId }` to allow real SendGrid smoke tests without forcing user-facing flows.

### Email previews (development only)

- Only available when `APP_ENV=development` **and** `EMAIL_PREVIEW_LOG=true`.
- Preview entries are written to `backend/cache/email-previews.log`.
- Production never writes preview logs, regardless of env vars.
- To verify, run `bash ./scripts/dev-email-probe.sh` after starting the dev stack with previews enabled.

## Error Pages & Operational Alerts

- Configure the branded copy + service name once via env:
  - Backend: `SERVICE_NAME`, `ALERT_FROM`, `ALERT_TO` (or `ALERTS_EMAIL_TO` fallback), `ALERT_THROTTLE_MINUTES` (minutes between duplicate 5xx alerts).
  - Frontend: `REACT_APP_BRAND_KEY` (`trbg`, `mms`, `mmh`), `REACT_APP_SERVICE_NAME` (overrides), `REACT_APP_SUPPORT_EMAIL`.
- `docs/error-envelope.md` documents the JSON error contract; run `bash scripts/verify-error-envelope.sh` to guard it.
- CRA already ships with the standard SPA rewrite rules; on GoDaddy ensure `.htaccess` (or hosting rewrite rules) send unknown routes to `index.html` so the 404 React page renders instead of a blank screen.
- 404 pages never send alerts. 5xx alerts run through SendGrid via `ErrorAlert::maybeSend` with throttling + request IDs.

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
- Error payload guardrail: `scripts/verify-error-envelope.sh`
- Email preview probe: `scripts/dev-email-probe.sh`

See `docs/Generic-Scripts-Reference.md` for behavior, dependencies, and failure modes.

## Testing

- Frontend: `cd frontend && npm test` or `npm run test:ci` (Jest).
- Backend smoke tests: `bash backend/test-api.sh` (hits `/api/health`, menu, login, CORS, admin endpoints).
- Full stack: `bash scripts/dev-verify.sh` to start, health-check, restart, and stop both services.
- API error envelope guardrail: `bash scripts/verify-error-envelope.sh` (requires running dev stack).
- Email previews / recipient sanity: `bash scripts/dev-email-probe.sh` (writes/reads `backend/cache/email-previews.log`; requires dev stack + APP_ENV!=production).

## Change History

Recent documentation and operational updates live in `docs/CHANGELOG.md`.
- **Verification checklist**
  1. Set `EMAIL_PREVIEW_LOG=true` locally, run `bash scripts/dev-email-probe.sh`, confirm ops previews route to `thundergrillmidway@gmail.com` and alerts to `support@jamarq.digital`.
  2. With admin JWT, hit `POST /api/admin/test-email` (type `ops` + `alert`) to generate real messages against staging/production SendGrid; confirm they arrive with correct sender/subject/metadata.
  3. In SendGrid, confirm both sender identities (`no-reply@trbgmidway.com`, `alerts@trbgmidway.com`) show as verified and domain-authenticated.
