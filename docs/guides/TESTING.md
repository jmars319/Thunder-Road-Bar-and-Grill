# TESTING

TRBG currently ships with a Vite React frontend (Vitest) and a PHP backend without an automated PHPUnit suite. This guide explains the supported testing commands plus the manual smoke tests maintained in the repo.

## Frontend (React + Jest)

Run from repository root or inside `frontend/`:

```bash
cd frontend
npm test                     # interactive mode
CI=true npm test -- --watchAll=false --runInBand   # single pass (CI style)
npm run test:ci              # wrapper around the command above
```

Logs (if you capture them) typically live in `test-logs/frontend-tests.log`.

## Backend smoke tests (PHP)

There is no PHPUnit suite yet, but `backend/test-api.sh` performs curl-based checks against a running server:

```bash
# ensure php -S localhost:5001 router.php is running
bash backend/test-api.sh
```

What it covers:
- `/api/health`
- `/api/menu`
- `/api/login` (expected invalid credentials response)
- CORS preflight headers
- Admin menu access when `X-Admin-Auth: admin` header is provided (dev-only)

Logs/output are printed to stdout; capture them if needed for audits.

## Full-stack verification

`scripts/dev-verify.sh` runs the orchestrated workflow:

1. Stops any running dev servers.
2. Starts backend + frontend via `scripts/dev-start.sh`.
3. Hits backend health, frontend root, and proxy (`/api/health` through CRA).
4. Restarts the stack (`scripts/dev-restart.sh`).
5. Repeats checks, then stops both services.

Use this before large refactors or when validating changes to the dev scripts.

## Suggested next steps

- Add a lightweight PHPUnit smoke suite for critical routes once time allows.
- Expand `backend/test-api.sh` to cover media upload/delete once the pipeline is finalized.
- Integrate `scripts/dev-verify.sh` into CI for pre-merge validation.

_Last updated: 2025-12-24_
