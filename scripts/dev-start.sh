#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

log_info "Starting dev stack"
bash "$SCRIPT_DIR/dev-backend-start.sh"
bash "$SCRIPT_DIR/dev-frontend-start.sh"
verify_proxy_chain || true
log_info "Dev stack is running"
