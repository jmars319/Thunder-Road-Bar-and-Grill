# Generic Script Reference

All scripts live under `scripts/` in the project repo. Every script assumes it is executed from the repo root (unless noted) and relies on a standard layout:

- `backend/` (API)
- `frontend/` (web app)

This document contains **portable, reusable tooling only**. Project-specific verification suites (domain endpoints, custom tables, legacy workflows) are intentionally excluded.

---

## Deployment Helpers

### scripts/make-deploy-zips.sh
- **Purpose:** Builds production deployment archives (commonly for cPanel/manual uploads) by zipping backend and frontend outputs separately.
- **Key actions:**
  - Deletes prior frontend/backend deploy archives and legacy names to avoid stale bundles.
  - Zips `backend/` into `backend-deploy.zip` while excluding secrets and runtime data (commonly `.env*`, `uploads/`, `.DS_Store`).
  - Zips `frontend/build/` into `frontend-deploy.zip`, and may inject repo-root `.htaccess` at the archive root (Apache rewrite compatibility).
  - Emits size/listing summaries (`ls`, `unzip -l`) for quick inspection.
- **Dependencies:** `zip`, `unzip`, writable repo root, finished `frontend/build/`, repo-root `.htaccess` (if applicable).
- **Usage:** `bash scripts/make-deploy-zips.sh`

### scripts/check-deploy-zips.sh
- **Purpose:** Verifies deploy archives contain exactly what production expects.
- **Key actions:**
  - Confirms `backend-deploy.zip` and `frontend-deploy.zip` exist.
  - Lists archive contents for manual review.
  - Runs automated checks (e.g., ensures backend zip contains required entry points and excludes `.env*` / `uploads/`).
- **Dependencies:** `unzip`, `grep`, `bash`.
- **Usage:** `bash scripts/check-deploy-zips.sh`

---

## Dev Environment Management

### scripts/dev-common.sh
- **Purpose:** Shared helper library sourced by all dev scripts; centralizes defaults, config overrides, and health/proxy utilities.
- **Highlights:**
  - Loads overrides from `.dev/dev-config.sh` (see template below).
  - Defines ports/hosts/document roots and helper functions for health checks and proxy verification.
  - Enforces dev proxy correctness by inspecting `frontend/package.json` unless explicitly disabled.
  - Validates frontend API config defaults to `/api` so the proxy chain works.
  - Uses tools like `curl`, `lsof`, `nc`, or Bash TCP sockets to detect listener ports and service health.
- **Usage:** Not run directly; scripts source it after exporting `ROOT_DIR`.

### scripts/dev-config.example.sh
- **Purpose:** Template for `.dev/dev-config.sh`, allowing developers to override port numbers, directories, and proxy enforcement.
- **Usage:** Copy to `.dev/dev-config.sh`, then uncomment desired `export` lines.

### scripts/dev-backend-start.sh / dev-backend-stop.sh / dev-backend-restart.sh
- **Purpose:** Manage the backend dev server.
- **Typical behavior:**
  - `start`: ensures no stale PID/port usage, launches `php -S $HOST:$PORT router.php`, tails logs to `.dev/backend.log`, waits for `/api/health`, then records the PID under `.dev/backend.pid`.
  - `stop`: reads `.dev/backend.pid`, terminates recorded processes (and children), escalates if needed, then removes the pid file and confirms the port is free.
  - `restart`: wraps `stop` + `start`, failing if PID files linger or the port is still bound.
- **Dependencies:** PHP CLI, `curl`, `lsof`, optional `pkill`, write access to `.dev/`.
- **Usage:** `bash scripts/dev-backend-start.sh`, etc.

### scripts/dev-frontend-start.sh / dev-frontend-stop.sh / dev-frontend-restart.sh
- **Purpose:** Start/stop the frontend dev server (commonly Create React App).
- **Typical behavior:**
  - `start`: validates proxy + API config, launches `npm start` with logs to `.dev/frontend.log`, waits for HTTP readiness, and records PIDs under `.dev/frontend.pid`.
  - `stop`: terminates recorded processes and children, removes pid file.
  - `restart`: wraps stop+start with port/PID sanity checks.
- **Dependencies:** Node/npm, correct proxy config, `grep`, `curl`, `lsof`.
- **Usage:** `bash scripts/dev-frontend-start.sh`, etc.

### scripts/dev-start.sh / dev-stop.sh / dev-restart.sh / dev-status.sh
- **Purpose:** Orchestrate backend + frontend together.
- **Typical behavior:**
  - `dev-start.sh`: starts backend, waits for `/api/health`, starts frontend, then verifies the proxy chain (frontend → backend health) before declaring success.
  - `dev-stop.sh`: stops frontend then backend, ensuring PID files vanish and ports close.
  - `dev-restart.sh`: stops both, starts backend+frontend in sequence, and confirms proxy health (with rollback behavior if frontend fails).
  - `dev-status.sh`: prints a summary table of running/stopped state, port listeners, and PID info.
- **Usage:** `bash scripts/dev-start.sh`, etc.

---

## Dev Verification Suites

### scripts/dev-verify.sh
- **Purpose:** Smoke-tests the local dev stack end-to-end.
- **Flow:**
  - Stops any running dev servers for a clean baseline.
  - Starts the stack (`dev-start.sh`), hits backend health, frontend root, and proxy health.
  - Restarts the stack (`dev-restart.sh`) and re-runs health checks.
  - Stops everything at the end.
- **Dependencies:** Those from orchestrators plus `curl`.
- **Usage:** `bash scripts/dev-verify.sh`

---

## Summary Table

| Script | Category | Primary role |
| --- | --- | --- |
| `make-deploy-zips.sh` | Deployment | Build backend/frontend deploy zips with correct exclusions/inclusions. |
| `check-deploy-zips.sh` | Deployment | Validate deploy zips (contents + forbidden files). |
| `dev-common.sh` | Dev tooling | Shared helpers/constants for dev scripts. |
| `dev-config.example.sh` | Dev tooling | Template for overriding dev defaults via `.dev/dev-config.sh`. |
| `dev-backend-start.sh` | Dev server | Launch backend dev server. |
| `dev-backend-stop.sh` | Dev server | Stop backend dev server and clean PID files. |
| `dev-backend-restart.sh` | Dev server | Restart backend dev server with sanity checks. |
| `dev-frontend-start.sh` | Dev server | Launch frontend dev server with proxy validation. |
| `dev-frontend-stop.sh` | Dev server | Stop frontend dev server. |
| `dev-frontend-restart.sh` | Dev server | Restart frontend dev server. |
| `dev-start.sh` | Orchestration | Start both servers and verify proxy chain. |
| `dev-stop.sh` | Orchestration | Stop both servers and confirm ports clear. |
| `dev-restart.sh` | Orchestration | Restart entire dev stack with verification. |
| `dev-status.sh` | Observatory | Report running/stopped/PID/port info for dev servers. |
| `dev-verify.sh` | Verification | Full-stack smoke test (start, health checks, restart). |

---

## Appendix: Adding Project-Specific Suites

When a project needs domain-specific verification or ops helpers (e.g., seating guardrails, menu hydration audits, migrations for legacy data):

- Add them under `scripts/` as usual
- Label them explicitly in headings and the summary table (e.g., “TRBG-specific”)
- Document assumptions and side effects clearly
- Assume dev/disposable data unless explicitly stated otherwise

Keep this generic reference file focused on portable tooling so it can be copied between repos cleanly.
