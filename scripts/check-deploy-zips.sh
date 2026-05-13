#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_ZIP="$ROOT_DIR/site-deploy.zip"

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

[[ -f "$SITE_ZIP" ]] || { err "Missing $SITE_ZIP"; exit 1; }

zip_name_matches() {
  local pattern="$1"
  if (set +o pipefail >/dev/null 2>&1 || true; unzip -Z1 "$SITE_ZIP" | grep -Eq "$pattern"); then
    return 0
  fi
  return 1
}

zip_contains() {
  local pattern="$1"
  if zip_name_matches "$pattern"; then
    return 0
  fi
  err "site-deploy.zip missing required entry matching: $pattern"
  exit 1
}

zip_absent() {
  local pattern="$1" message="$2"
  if zip_name_matches "$pattern"; then
    err "$message"
    exit 1
  fi
}

log "Validating site zip"
zip_contains '^index[.]html$'
zip_contains '^admin/index[.]html$'
zip_contains '^assets/index-.*[.]js$'
zip_contains '^assets/admin-.*[.]js$'
zip_contains '^assets/.*[.]css$'
zip_contains '^robots[.]txt$'
zip_contains '^sitemap[.]xml$'
zip_contains '^[.]htaccess$'
zip_contains '^api/index[.]php$'
zip_contains '^api/router[.]php$'
zip_contains '^api/vendor/autoload[.]php$'
zip_contains '^api/uploads/[.]htaccess$'
zip_contains '^api/cache/[.]htaccess$'
zip_contains '^api/[.]htaccess$'

zip_absent '(^|/)[.]env($|[.])' "site zip contains .env files"
zip_absent '^api/(incoming|logs)/' "site zip contains server-owned incoming files or logs"
zip_absent '^api/(tests|scripts)/' "site zip contains backend tests or local scripts"
zip_absent '^api/(composer[.](json|lock)|README[.]md|start-dev[.]sh|test-api[.]sh)$' "site zip contains backend dev files"
zip_absent '^api/vendor/phpmailer/phpmailer/(SMTPUTF8[.]md|COMMITMENT|SECURITY[.]md|get_oauth_token[.]php)$' "site zip contains PHPMailer development/support files"
zip_absent '(^|/)[.]gitignore$|[.]map$' "site zip contains git metadata or source maps"
zip_absent '^frontend/|^backend/|^node_modules/|^src/' "site zip contains source directories"

upload_entries="$(unzip -Z1 "$SITE_ZIP" | grep -E '^api/uploads/' || true)"
if printf '%s\n' "$upload_entries" | grep -Ev '^api/uploads/?$|^api/uploads/[.]htaccess$' >/dev/null; then
  err "site zip contains uploaded media"
  exit 1
fi

cache_entries="$(unzip -Z1 "$SITE_ZIP" | grep -E '^api/cache/' || true)"
if printf '%s\n' "$cache_entries" | grep -Ev '^api/cache/?$|^api/cache/[.]htaccess$' >/dev/null; then
  err "site zip contains runtime cache data"
  exit 1
fi

if grep -E -q 'https?://(localhost|127\.0\.0\.1):[0-9]+' < <(unzip -p "$SITE_ZIP" 2>/dev/null || true); then
  err "site zip contains a localhost URL with a port"
  exit 1
fi

root_htaccess="$(unzip -p "$SITE_ZIP" .htaccess 2>/dev/null || true)"
if ! grep -Eq 'admin/index[.]html' <<< "$root_htaccess"; then
  err "root .htaccess is missing admin bundle routing"
  exit 1
fi

api_htaccess="$(unzip -p "$SITE_ZIP" api/.htaccess 2>/dev/null || true)"
if ! grep -Eq 'logs|cache|incoming|vendor|routes|utils|scripts' <<< "$api_htaccess"; then
  err "api .htaccess is missing server-file blocking rules"
  exit 1
fi

ok "site-deploy.zip validation complete"
