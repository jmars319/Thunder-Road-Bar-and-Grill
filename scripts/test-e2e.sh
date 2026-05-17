#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
export E2E_ROUTES="/,/privacy,/terms,/admin"
env -u NO_COLOR FORCE_COLOR=0 npx playwright test
