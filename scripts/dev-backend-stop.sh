#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

if [[ ! -f "$BACKEND_PID_FILE" ]]; then
  log_info "Backend is not running"
  if port_in_use "$BACKEND_PORT"; then
    log_warn "Port $BACKEND_PORT in use without PID file; attempting cleanup"
    ensure_port_released "$BACKEND_PORT" 20 || true
  fi
  exit 0
fi

pid=$(cat "$BACKEND_PID_FILE")
if [[ -z "$pid" ]]; then
  rm -f "$BACKEND_PID_FILE"
  ensure_port_released "$BACKEND_PORT" 20 || true
  exit 0
fi

if is_pid_running "$pid"; then
  log_info "Stopping backend PID $pid"
  terminate_process_tree "$pid"
else
  log_warn "Recorded backend PID $pid is not running"
fi

rm -f "$BACKEND_PID_FILE"
ensure_port_released "$BACKEND_PORT" 20
log_info "Backend stopped"
