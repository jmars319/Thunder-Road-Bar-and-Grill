#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

log_info "Restarting dev stack"
if ! bash "$SCRIPT_DIR/dev-stop.sh"; then
  log_error "Failed to stop dev stack cleanly"
  exit 1
fi
if ! bash "$SCRIPT_DIR/dev-start.sh"; then
  log_error "Dev stack restart failed"
  bash "$SCRIPT_DIR/dev-stop.sh" || true
  exit 1
fi
