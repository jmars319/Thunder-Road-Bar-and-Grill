#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=dev-common.sh
source "$SCRIPT_DIR/dev-common.sh"

service_status() {
  local name="$1" pid_file="$2" port="$3" health_cmd="$4"
  local pid="-"
  local running="stopped"
  local health="-"
  if [[ -f "$pid_file" ]]; then
    pid=$(cat "$pid_file")
    if is_pid_running "$pid"; then
      running="running"
      if eval "$health_cmd" >/dev/null 2>&1; then
        health="ok"
      else
        health="fail"
      fi
    fi
  fi
  printf "%-9s %-10s %-8s %-8s\n" "$name" "$pid" "$port" "$running/$health"
}

printf "%-9s %-10s %-8s %-8s\n" "Service" "PID" "Port" "State"
printf "%-9s %-10s %-8s %-8s\n" "-------" "----------" "--------" "--------"
service_status "backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" "curl --silent --fail --max-time 2 '$BACKEND_HEALTH_URL'"
service_status "frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" "curl --silent --fail --max-time 2 '$FRONTEND_BASE_URL'"
