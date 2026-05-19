#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-test-ports.sh
source "$SCRIPT_DIR/dev-test-ports.sh"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

cleanup() {
  local exit_code=$?
  set +e
  bash "$SCRIPT_DIR/dev-stop.sh" >/dev/null 2>&1 || true
  return "$exit_code"
}
trap cleanup EXIT

bash "$SCRIPT_DIR/dev-stop.sh" >/dev/null 2>&1 || true
export DEV_BROWSER_OPEN=0
# Keep rate limiting enabled while allowing the e2e runner's single loopback IP
# to make repeated public requests during CLS and route-smoke passes.
export RATE_LIMIT_GLOBAL="${RATE_LIMIT_GLOBAL:-2000}"
export RATE_LIMIT_PUBLIC="${RATE_LIMIT_PUBLIC:-1000}"
export RATE_LIMIT_STRICT="${RATE_LIMIT_STRICT:-500}"
bash "$SCRIPT_DIR/dev-sync-public-data.sh" >/dev/null 2>&1 || log_warn "Unable to refresh public snapshots; local database or existing snapshots must cover public routes."
bash "$SCRIPT_DIR/dev-start.sh"
wait_for_frontend_ready 60

mkdir -p "$BACKEND_DIR/cache/ratelimit"
find "$BACKEND_DIR/cache/ratelimit" -type f -name '*.txt' -delete
API_BASE="$BACKEND_BASE_URL/api" npm run check:error-envelope
CLS_BASE_URL="$FRONTEND_BASE_URL" \
  CLS_DOWNLOAD_BPS=5242880 \
  CLS_UPLOAD_BPS=5242880 \
  CLS_LATENCY_MS=20 \
  CLS_CPU_RATE=1 \
  CLS_DWELL_MS=3000 \
  npm run cls:headless

export E2E_BASE_URL="$FRONTEND_BASE_URL"
export E2E_ROUTES="/,/privacy,/terms,/status/access-denied,/status/server-error,/status/maintenance,/missing-page-check,/admin"
env -u NO_COLOR FORCE_COLOR=0 npx playwright test --workers="${PLAYWRIGHT_WORKERS:-2}"
