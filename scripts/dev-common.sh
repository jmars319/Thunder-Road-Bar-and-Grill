#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${__TRBG_DEV_COMMON_SOURCED:-}" ]]; then
  return 0 2>/dev/null || true
fi
__TRBG_DEV_COMMON_SOURCED=1

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Optional overrides default to .dev/dev-config.sh
if [[ -f "$ROOT_DIR/.dev/dev-config.sh" ]]; then
  # shellcheck disable=SC1090
  source "$ROOT_DIR/.dev/dev-config.sh"
fi

DEV_DIR="${DEV_DIR:-$ROOT_DIR/.dev}"
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/backend}"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT_DIR/frontend}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DEV_PROXY_CHECK="${DEV_PROXY_CHECK:-1}"
BACKEND_PID_FILE="$DEV_DIR/backend.pid"
FRONTEND_PID_FILE="$DEV_DIR/frontend.pid"
BACKEND_LOG_FILE="$DEV_DIR/backend.log"
FRONTEND_LOG_FILE="$DEV_DIR/frontend.log"

BACKEND_BASE_URL="http://$BACKEND_HOST:$BACKEND_PORT"
BACKEND_HEALTH_URL="$BACKEND_BASE_URL/api/health"
FRONTEND_BASE_URL="http://$FRONTEND_HOST:$FRONTEND_PORT"

log_info() { printf '\033[1;32m[INFO]\033[0m %s\n' "$*"; }
log_warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
log_error() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*"; }

ensure_dev_dir() {
  mkdir -p "$DEV_DIR"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_command() {
  if ! command_exists "$1"; then
    log_error "Missing required command: $1"
    exit 1
  fi
}

wait_for_backend_ready() {
  local attempts=${1:-30}
  for ((i=1; i<=attempts; i++)); do
    if curl --silent --fail --max-time 2 "$BACKEND_HEALTH_URL" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  log_error "Backend did not become ready at $BACKEND_HEALTH_URL"
  return 1
}

wait_for_frontend_ready() {
  local attempts=${1:-30}
  for ((i=1; i<=attempts; i++)); do
    if curl --silent --fail --max-time 2 "$FRONTEND_BASE_URL" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  log_error "Frontend did not become ready at $FRONTEND_BASE_URL"
  return 1
}

port_in_use() {
  local port="$1"
  lsof -PiTCP -sTCP:LISTEN -n -P 2>/dev/null | grep -q ":$port "
}

wait_for_port_free() {
  local port="$1"
  local attempts=${2:-20}
  for ((i=1; i<=attempts; i++)); do
    if ! port_in_use "$port"; then
      return 0
    fi
    sleep 1
  done
  log_error "Port $port is still in use"
  return 1
}

read_pid_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

terminate_process_tree() {
  local pid="$1"
  if [[ -z "$pid" ]]; then
    return
  fi
  if ! is_pid_running "$pid"; then
    return
  fi
  if command_exists pkill; then
    pkill -TERM -P "$pid" >/dev/null 2>&1 || true
  fi
  kill "$pid" >/dev/null 2>&1 || true
  wait "$pid" 2>/dev/null || true
}

force_kill_port_processes() {
  local port="$1"
  local offenders
  offenders=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -z "$offenders" ]]; then
    return
  fi
  log_warn "Force killing processes still using port $port: $offenders"
  while read -r offender; do
    [[ -n "$offender" ]] && kill -9 "$offender" >/dev/null 2>&1 || true
  done <<< "$offenders"
}

ensure_port_released() {
  local port="$1"
  local attempts=${2:-20}
  if wait_for_port_free "$port" "$attempts"; then
    return 0
  fi
  force_kill_port_processes "$port"
  wait_for_port_free "$port" "$attempts"
}

normalize_host_for_match() {
  case "$1" in
    127.0.0.1|localhost) echo "loopback" ;;
    *) echo "$1" ;;
  esac
}

verify_proxy_chain() {
  if [[ "$DEV_PROXY_CHECK" == "0" ]]; then
    log_info "DEV_PROXY_CHECK=0; skipping proxy verification"
    return 0
  fi

  local package_json="$FRONTEND_DIR/package.json"
  if [[ ! -f "$package_json" ]]; then
    log_error "Cannot locate $package_json"
    return 1
  fi

  require_command node
  local proxy_value
  proxy_value=$(node -pe "require(process.argv[1]).proxy || ''" "$package_json" 2>/dev/null || true)

  if [[ -n "$proxy_value" ]]; then
    local expected="http://$BACKEND_HOST:$BACKEND_PORT"
    if [[ "$proxy_value" != "$expected" ]]; then
      log_error "package.json proxy ($proxy_value) does not match backend ($expected)"
      return 1
    fi
    if ! curl --silent --fail --max-time 2 "$FRONTEND_BASE_URL/api/health" >/dev/null; then
      log_error "Frontend proxy did not respond at $FRONTEND_BASE_URL/api/health"
      return 1
    fi
    log_info "CRA proxy points to $expected and responded at /api/health"
    return 0
  fi

  local api_config="$FRONTEND_DIR/src/config/api.js"
  if [[ ! -f "$api_config" ]]; then
    log_error "Cannot locate $api_config"
    return 1
  fi

  local api_base
  api_base=$(grep -Eo "process\.env\.REACT_APP_API_BASE \|\| '[^']+'" "$api_config" | head -n1 | sed -E "s/.*\|\| '([^']+)'.*/\1/")

  if [[ -z "$api_base" ]]; then
    log_error "Unable to parse API base default from $api_config"
    return 1
  fi

  local expected_api="http://$BACKEND_HOST:$BACKEND_PORT/api"
  local base_host base_port
  base_host=$(echo "$api_base" | sed -E 's~^https?://([^:/]+).*~\1~')
  base_port=$(echo "$api_base" | sed -E 's~^https?://[^:/]+:([0-9]+).*~\1~')
  if [[ ! "$base_port" =~ ^[0-9]+$ ]]; then
    base_port=$([[ "$api_base" == https:* ]] && echo 443 || echo 80)
  fi

  if [[ "$(normalize_host_for_match "$base_host")" != "$(normalize_host_for_match "$BACKEND_HOST")" ]] || [[ "$base_port" != "$BACKEND_PORT" ]]; then
    log_error "API base default ($api_base) does not match backend ($expected_api)"
    return 1
  fi

  if ! curl --silent --fail --max-time 2 "$FRONTEND_BASE_URL/api/health" >/dev/null; then
    log_error "Frontend could not reach backend via /api/health at $FRONTEND_BASE_URL"
    return 1
  fi

  log_info "Frontend uses explicit API base $api_base and verified /api/health reachability"
  return 0
}
