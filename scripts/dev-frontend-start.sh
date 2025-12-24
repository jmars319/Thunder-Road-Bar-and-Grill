#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

ensure_dev_dir

if [[ -f "$FRONTEND_PID_FILE" ]]; then
  pid=$(cat "$FRONTEND_PID_FILE")
  if is_pid_running "$pid"; then
    log_error "Frontend already running (PID $pid)"
    exit 1
  fi
  rm -f "$FRONTEND_PID_FILE"
fi

if port_in_use "$FRONTEND_PORT"; then
  log_warn "Port $FRONTEND_PORT in use; attempting to free it"
  ensure_port_released "$FRONTEND_PORT" 10 || {
    log_error "Port $FRONTEND_PORT is still in use"
    exit 1
  }
fi

require_command npm

log_info "Starting frontend (CRA) on $FRONTEND_HOST:$FRONTEND_PORT"
: > "$FRONTEND_LOG_FILE"
(
  cd "$FRONTEND_DIR"
  HOST="$FRONTEND_HOST" PORT="$FRONTEND_PORT" BROWSER=none npm start >"$FRONTEND_LOG_FILE" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
)

pid=$(cat "$FRONTEND_PID_FILE")
log_info "Frontend PID $pid (log: $FRONTEND_LOG_FILE)"

if ! wait_for_frontend_ready 30; then
  log_error "Frontend failed to start; see $FRONTEND_LOG_FILE"
  bash "$SCRIPT_DIR/dev-frontend-stop.sh" || true
  exit 1
fi

if ! verify_proxy_chain; then
  log_warn "Proxy/API configuration check failed"
  if [[ "$DEV_PROXY_CHECK" != "0" ]]; then
    bash "$SCRIPT_DIR/dev-frontend-stop.sh" || true
    exit 1
  fi
fi

log_info "Frontend is ready at $FRONTEND_BASE_URL"
