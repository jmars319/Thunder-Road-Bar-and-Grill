#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

log_info "Starting dev stack"
# Ensure backend inherits the same permissive PHP ini caps when orchestrating full stack.
if [[ -z "${DEV_BACKEND_PHP_FLAGS:-}" ]]; then
  export DEV_BACKEND_PHP_FLAGS="-d upload_max_filesize=20M -d post_max_size=25M -d memory_limit=256M -d max_execution_time=120"
fi
bash "$SCRIPT_DIR/dev-backend-start.sh"
bash "$SCRIPT_DIR/dev-frontend-start.sh"
verify_proxy_chain || true
log_info "Dev stack is running"
