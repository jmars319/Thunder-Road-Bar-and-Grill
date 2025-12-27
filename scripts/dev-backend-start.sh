#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

ensure_dev_dir

if [[ -f "$BACKEND_PID_FILE" ]]; then
  pid=$(cat "$BACKEND_PID_FILE")
  if is_pid_running "$pid"; then
    log_error "Backend already running (PID $pid)"
    exit 1
  fi
  rm -f "$BACKEND_PID_FILE"
fi

if port_in_use "$BACKEND_PORT"; then
  log_error "Port $BACKEND_PORT is already in use"
  exit 1
fi

require_command php

log_info "Starting PHP backend on $BACKEND_HOST:$BACKEND_PORT"
: > "$BACKEND_LOG_FILE"
# Use permissive dev-only PHP ini caps so uploads align with UploadLimits helper.
(
  cd "$BACKEND_DIR"
  php \
    -d upload_max_filesize=20M \
    -d post_max_size=25M \
    -d memory_limit=256M \
    -d max_execution_time=120 \
    -S "$BACKEND_HOST:$BACKEND_PORT" router.php >"$BACKEND_LOG_FILE" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
)

pid=$(cat "$BACKEND_PID_FILE")
log_info "Backend PID $pid (log: $BACKEND_LOG_FILE)"

if ! wait_for_backend_ready 30; then
  log_error "Backend failed health check; see $BACKEND_LOG_FILE"
  bash "$SCRIPT_DIR/dev-backend-stop.sh" || true
  exit 1
fi

log_info "Backend is ready at $BACKEND_HEALTH_URL"
