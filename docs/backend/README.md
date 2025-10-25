```markdown
# Backend README — Thunder Road API

This document describes the backend service located in `backend/`. It covers quick start, environment variables, available scripts, and where to find important files and routes.

Purpose
-------
- Provides the REST API used by the frontend and admin tools.
- Handles uploads (images/videos), reservations, menu data, newsletter, contact messages, and simple admin authentication.

Quick start (local)
-------------------
From the repository root:

```bash
cd backend
npm install
# development with auto-reload
npm run dev
# or run the production entrypoint
npm start
```

The server binds to `PORT` (default 5001) and mounts its API under `/api`.

Environment variables
---------------------
Provide these in a local `.env` file (do not commit secrets):

- `PORT` — optional, defaults to `5001`.
- `FRONTEND_URL` — allowed CORS origin (defaults to `http://localhost:3000`).
- `DB_HOST` — MySQL host (defaults to `localhost`).
- `DB_USER` — MySQL user (defaults to `root`).
- `DB_PASSWORD` — MySQL password (required for production DBs).
- `DB_NAME` — MySQL database name (defaults to `thunder_road`).
- `DB_CONN_LIMIT` — connection pool size (defaults to `10`).

Middleware & limits
-------------------
- Gzip/brotli compression enabled via `compression()`.
- JSON body size limited to `1mb` to avoid large payloads.
- File uploads use `multer` and are stored in `backend/uploads/`.
  - Max file size: 5 MB
  - Allowed mime types: JPEG, PNG, GIF, WEBP, MP4

Scripts (from `backend/package.json`)
-----------------------------------
- `npm start` — run `node server.js` (production entrypoint)
- `npm run dev` — run `nodemon server.js` (development with reload)
- `npm run test:integration` — quick integration test runner (internal test file)
- `npm run lint` — run ESLint across backend JS files
- `npm run lint:fix` — run ESLint with `--fix`

Routes and API surface
----------------------
Routes are mounted under `/api` in `server.js`. Each route module exports an Express Router and is located in `backend/routes/`.

Common route modules (mounted under `/api`):
- `auth` — authentication endpoints
- `menu` — menu data (menus, categories, items)
- `reservations` — create/list reservations
- `jobs` / `job-config` — job postings and configuration
- `media` — upload and serve media items
- `settings` — site-wide settings
- `newsletter` — newsletter signup
- `contact` — contact form submissions

Important files
---------------
- `server.js` — express bootstrap and middleware wiring (source of truth for mounts and middleware)
- `routes/` — all route handlers and business logic (keep complex logic out of `server.js`)
- `middleware/` — reusable middleware such as auth checks
- `uploads/` — runtime uploads directory (ensure it is writable by the server)
- `.env` — local environment overrides (not committed)

Logs & local runtime
--------------------
- The repository may include `backend-5001.log` and `backend-nohup.log` used during local runs; rotate or remove as needed.

Testing and linting
-------------------
- Integration tests live under `backend/tests/` (see `test:integration` script).
- Use `npm run lint` and `npm run lint:fix` to keep JS consistent.

Operational notes
-----------------
- CORS origin is controlled by `FRONTEND_URL`. Set this explicitly in production.
- Sensitive values must be provided via environment variables. Do not commit credentials.
- For production deployments, place this service behind a reverse proxy or CDN and add extra hardening (e.g., `helmet()`).

Linking to repo docs
--------------------
This project centralizes developer docs in `docs/`. See `docs/INDEX.md` for additional guides (linting, maintenance, frontend developer guide).

Contributing
------------
Follow the repository `CONTRIBUTING.md` for PR workflow and code style. Keep `server.js` as the thin wiring layer and put complex logic in `routes/` or helper modules.

If you'd like, I can extend this README by auto-extracting available endpoints from `backend/routes/` and include an example `.env.example`.

Last updated: 2025-10-25

```
