#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ZIP="$ROOT_DIR/deploy-backend.zip"
FRONTEND_ZIP="$ROOT_DIR/deploy-frontend.zip"
FRONTEND_HTACCESS_SOURCE="$ROOT_DIR/frontend/public/.htaccess"
REQUIRE_FRONTEND_HTACCESS=0
[[ -f "$FRONTEND_HTACCESS_SOURCE" ]] && REQUIRE_FRONTEND_HTACCESS=1

log() { printf '\033[1;34m[CHECK]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1"
    exit 1
  fi
}

require_cmd unzip
require_cmd grep

[[ -f "$BACKEND_ZIP" ]] || { err "Missing $BACKEND_ZIP"; exit 1; }
[[ -f "$FRONTEND_ZIP" ]] || { err "Missing $FRONTEND_ZIP"; exit 1; }

zip_contains() {
  local zip_path="$1" needle="$2"
  if (set +o pipefail >/dev/null 2>&1 || true; unzip -l "$zip_path" | grep -q -- "$needle"); then
    return 0
  fi
  return 1
}

check_backend_zip() {
  log "Validating backend zip"
  if ! zip_contains "$BACKEND_ZIP" 'index.php'; then
    err "backend zip missing index.php"
    exit 1
  fi
  if ! zip_contains "$BACKEND_ZIP" 'router.php'; then
    err "backend zip missing router.php"
    exit 1
  fi
  if zip_contains "$BACKEND_ZIP" '.env'; then
    err "backend zip contains .env files"
    exit 1
  fi
  if zip_contains "$BACKEND_ZIP" 'uploads/'; then
    err "backend zip should not include uploads/"
    exit 1
  fi
  log "Backend zip contents look good"
}

check_frontend_zip() {
  log "Validating frontend zip"
  if ! zip_contains "$FRONTEND_ZIP" 'index.html'; then
    err "frontend zip missing index.html"
    exit 1
  fi
  if ! zip_contains "$FRONTEND_ZIP" 'static/'; then
    err "frontend zip missing static/ assets"
    exit 1
  fi
  if [[ "$REQUIRE_FRONTEND_HTACCESS" -eq 1 ]]; then
    if ! zip_contains "$FRONTEND_ZIP" '.htaccess'; then
      err "frontend zip missing .htaccess"
      exit 1
    fi
  fi
  log "Frontend zip contents look good"
}

check_backend_zip
check_frontend_zip
log "Deploy zip validation complete"
