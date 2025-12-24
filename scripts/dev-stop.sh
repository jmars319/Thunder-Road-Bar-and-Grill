#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

log_info "Stopping dev stack"
bash "$SCRIPT_DIR/dev-frontend-stop.sh" >/dev/null 2>&1 || true
bash "$SCRIPT_DIR/dev-backend-stop.sh" >/dev/null 2>&1 || true
log_info "Dev stack stopped"
