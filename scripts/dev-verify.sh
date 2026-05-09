#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

step() {
  log_info "$1"
}

step "Cleaning up any running dev processes"
bash "$SCRIPT_DIR/dev-stop.sh" >/dev/null 2>&1 || true
export DEV_BROWSER_OPEN="${DEV_BROWSER_OPEN:-0}"

run_checks() {
  curl --silent --fail --max-time 5 "$BACKEND_HEALTH_URL" >/dev/null
  curl --silent --fail --max-time 5 "$FRONTEND_BASE_URL" >/dev/null
  verify_proxy_chain
}

step "Starting dev stack"
bash "$SCRIPT_DIR/dev-start.sh"
run_checks

step "Restarting dev stack"
bash "$SCRIPT_DIR/dev-restart.sh"
run_checks

step "Stopping dev stack"
bash "$SCRIPT_DIR/dev-stop.sh"

log_info "Dev verify completed successfully"
