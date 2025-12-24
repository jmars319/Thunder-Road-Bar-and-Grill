# Backend README — Thunder Road API (PHP)

This document covers the PHP backend that lives under `backend/`. It explains how to run it locally, configure `.env`, where major routes live, and which helper scripts keep media/email behavior aligned with TRBG requirements.

## Quick start

```bash
cd backend
composer install
cp .env.example .env   # configure DB, JWT_SECRET, SendGrid, etc.
php -S localhost:5001 router.php
```

- The built-in PHP server serves from `router.php` and mounts all routes under `/api` (`backend/index.php:1-190`).
- Health endpoint: `http://localhost:5001/api/health`.
- When using the repo-level dev scripts, `scripts/dev-backend-start.sh` runs the exact command above, writes logs to `.dev/backend.log`, and waits for `/api/health` before declaring success.

## Directory layout

| Path | Purpose |
| --- | --- |
| `backend/index.php` | Bootstraps config, middleware, router, and registers every `/api/*` route. |
| `backend/router.php` | Entry point used by `php -S`; funnels all requests into `index.php`. |
| `backend/routes/*.php` | Route handlers (menu, reservations, jobs, media, settings, newsletter, etc.). |
| `backend/middleware/*.php` | Auth, rate limiting, error handling, CORS. |
| `backend/utils/*.php` | Shared helpers (Config, Database, Logger, MediaPipeline, Email). |
| `backend/scripts/` | Operational scripts (media rehydration, resume cleanup, test harness). |
| `backend/uploads/` | Runtime storage for originals, variants, manifests (create + make writable in production). |
| `backend/scripts/rehydrate_media_variants.php` | Regenerates manifests/variants for legacy rows. |
| `backend/scripts/remove_resume_media.php` | Deletes legacy resume uploads/DB rows (category=resume). |
| `backend/test-api.sh` | Curl-based smoke test against `/api`. |

## Environment variables

Defined in `backend/.env.example` and `backend/.env.production.example`. Key groups:

- **Server & security:** `APP_ENV`, `APP_DEBUG`, `FORCE_HTTPS`, `JWT_SECRET`, `TRUST_PROXY`.
- **Database:** `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_CHARSET`.
- **Uploads:** `UPLOAD_DIR`, `MAX_UPLOAD_SIZE`, `ALLOWED_FILE_TYPES` (JPEG/PNG/GIF/WebP by default).
- **Caching / rate limits:** `CACHE_MENU`, `CACHE_MENU_TTL`, `RATE_LIMIT_*`.
- **Email:** `SEND_EMAILS`, `SENDGRID_API_KEY`, `STAFF_EMAIL_TO`, `ALERTS_EMAIL_TO`, `EMAIL_FROM_NOTIFICATIONS`, `EMAIL_FROM_ALERTS`.

> **Email gating:** `backend/utils/Email.php` only contacts SendGrid when `APP_ENV=production`, `SEND_EMAILS=true`, and `SENDGRID_API_KEY` is set. Otherwise `[email:skip]` entries appear in the PHP error log and the call returns success. Recipients are validated before any HTTP request.

## Useful scripts

| Script | Description |
| --- | --- |
| `backend/start-dev.sh` | Convenience wrapper for `php -S` (used by some developers; superseded by repo-level scripts). |
| `backend/scripts/rehydrate_media_variants.php` | Backfills manifests/srcsets for rows missing responsive variants. Run once after migrating legacy uploads. |
| `backend/scripts/remove_resume_media.php` | Deletes any `media_library` rows with `category='resume'` and removes associated files from `backend/uploads/`. |
| `backend/test-api.sh` | Curl-based smoke test covering `/api/health`, `/api/menu`, `/api/login` (expected failure), CORS preflight, and admin menu access. |

All scripts are plain PHP/ Bash and require nothing beyond PHP CLI + curl.

## Routes (overview)

Registered in `backend/index.php` via `Router`:

- `auth.php` – login + dev signin
- `user.php` – change password
- `menu.php` – public + admin menu endpoints (categories/items)
- `reservations.php` – POST `/api/reservations`, admin list/update/delete
- `jobs.php` – job positions & applications
- `media.php` – media library (upload, list, delete) using the MMH-style pipeline
- `settings.php` – hero/menu images, navigation, about, business hours
- `newsletter.php`, `contact.php` – subscription + contact form

See each file under `backend/routes/` for validation rules and payloads.

## Media pipeline

- Implementation lives in `backend/utils/MediaPipeline.php`, `MediaProfiles.php`, `MediaResponseBuilder.php`.
- Storage layout bootstrapped automatically: `uploads/originals/`, `uploads/optimized/`, `uploads/webp/`, `uploads/variants/optimized`, `uploads/variants/webp`, `uploads/manifests/`.
- Width profiles:
  - Hero: 1600 / 3200 / 4800 px (plus WebP equivalents)
  - Menu: 1440 / 2880 / 4320 px
- Each upload emits deterministic manifest JSON (`{basename}.json`) consumed by the frontend.
- Reference spec: `docs/TRBG-Image-Pipeline-Spec.md`.

## Logging & runtime paths

- `backend/logs/` – default log target (configure via `.env`).
- `backend/cache/` – rate-limit cache files, safe to clear between deploys.
- Ensure `backend/uploads/`, `backend/cache/`, and `backend/logs/` remain writable and are not replaced during deploys.

## Deployment tips

- Use `bash scripts/make-deploy-zips.sh` then `bash scripts/check-deploy-zips.sh` at repo root to prepare GoDaddy-friendly archives.
- On the server: upload to `public_html/api/`, run `composer install --no-dev`, copy `.env`, and ensure `uploads/` exists with `755` permissions.
- After copying legacy uploads, run `php scripts/rehydrate_media_variants.php` once to ensure manifests are present.

## Testing & verification

- Run `bash backend/test-api.sh` for a quick sanity check (expects the API at `http://localhost:5001/api`).
- Repo-level `bash scripts/dev-verify.sh` starts/stops both backend and frontend, verifying `/api/health` and CRA proxy behavior.
- There is no automated PHP test suite yet; rely on manual smoke tests plus frontend Jest coverage.

_Last updated: 2025-12-24_
