#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ZIP="$ROOT_DIR/backend-deploy.zip"
FRONTEND_ZIP="$ROOT_DIR/frontend-deploy.zip"
FRONTEND_HTACCESS_SOURCE="$ROOT_DIR/frontend/public/.htaccess"
REQUIRE_FRONTEND_HTACCESS=0
[[ -f "$FRONTEND_HTACCESS_SOURCE" ]] && REQUIRE_FRONTEND_HTACCESS=1

log() { printf '\033[1;34m[CHECK]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
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

zip_name_matches() {
  local zip_path="$1" pattern="$2"
  if (set +o pipefail >/dev/null 2>&1 || true; unzip -Z1 "$zip_path" | grep -Eq "$pattern"); then
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
  if zip_name_matches "$BACKEND_ZIP" '(^|/)[.]env($|[.])'; then
    err "backend zip contains .env files"
    exit 1
  fi
  if ! zip_name_matches "$BACKEND_ZIP" '^uploads/[.]htaccess$'; then
    err "backend zip missing uploads/.htaccess guard"
    exit 1
  fi
  local upload_entries
  upload_entries="$(unzip -Z1 "$BACKEND_ZIP" | grep -E '^uploads/' || true)"
  if printf '%s\n' "$upload_entries" | grep -Ev '^uploads/?$|^uploads/[.]htaccess$' >/dev/null; then
    err "backend zip should not include uploaded media; only uploads/.htaccess is allowed"
    exit 1
  fi
  if zip_name_matches "$BACKEND_ZIP" '(^|/)(tests|scripts)/'; then
    err "backend zip should not include tests/ or scripts/"
    exit 1
  fi
  if zip_name_matches "$BACKEND_ZIP" '^(README[.]md|start-dev[.]sh|test-api[.]sh)$'; then
    err "backend zip should not include development docs or local scripts"
    exit 1
  fi
  if zip_name_matches "$BACKEND_ZIP" '^composer[.](json|lock)$'; then
    err "backend zip should not include composer manifests when vendor/ is packaged"
    exit 1
  fi
  if zip_name_matches "$BACKEND_ZIP" '(^|/)[.]gitignore$|[.]map$'; then
    err "backend zip should not include git metadata or source maps"
    exit 1
  fi
  local backend_htaccess
  backend_htaccess="$(unzip -p "$BACKEND_ZIP" .htaccess 2>/dev/null || true)"
  if ! grep -Eq 'logs|cache|incoming|vendor|routes|utils|scripts' <<< "$backend_htaccess"; then
    err "backend zip .htaccess is missing server-file blocking rules"
    exit 1
  fi
  ok "Backend zip contents look good"
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
  if zip_name_matches "$FRONTEND_ZIP" '[.]map$'; then
    err "frontend zip should not include source maps"
    exit 1
  fi
  if zip_name_matches "$FRONTEND_ZIP" '(^|/)[.]gitignore$'; then
    err "frontend zip should not include git metadata"
    exit 1
  fi
  if grep -E -q 'https?://(localhost|127\.0\.0\.1):[0-9]+' < <(unzip -p "$FRONTEND_ZIP" 2>/dev/null || true); then
    err "frontend zip contains a localhost URL with a port"
    exit 1
  fi
  ok "Frontend zip contents look good"
}

check_backend_zip
check_frontend_zip
ok "Deploy zip validation complete"
