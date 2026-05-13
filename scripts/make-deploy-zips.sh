#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
FRONTEND_BUILD_DIR="$FRONTEND_DIR/build"
STAGE_DIR="$ROOT_DIR/.deploy-staging"
SITE_ZIP="$ROOT_DIR/site-deploy.zip"

log() { printf '\033[1;34m[MAKE]\033[0m %s\n' "$*"; }
ok() { printf '\033[1;32m[OK]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1"
    exit 1
  fi
}

require_cmd zip
require_cmd unzip
require_cmd npm
require_cmd rsync

log "Removing old deploy zips"
rm -f "$SITE_ZIP" "$ROOT_DIR/backend-deploy.zip" "$ROOT_DIR/frontend-deploy.zip"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/api"

log "Running fresh frontend build"
(cd "$FRONTEND_DIR" && npm run build)

if [[ -f "$FRONTEND_DIR/public/.htaccess" ]]; then
  cp "$FRONTEND_DIR/public/.htaccess" "$FRONTEND_BUILD_DIR/.htaccess"
fi

log "Staging frontend at web root"
rsync -a --delete \
  --exclude='.DS_Store' \
  --exclude='*/.DS_Store' \
  --exclude='*.map' \
  --exclude='*/.map' \
  "$FRONTEND_BUILD_DIR"/ "$STAGE_DIR"/

log "Staging backend under api/"
rsync -a --delete \
  --exclude='uploads/' \
  --exclude='incoming/' \
  --exclude='cache/' \
  --exclude='logs/' \
  --exclude='tests/' \
  --exclude='scripts/' \
  --exclude='README.md' \
  --exclude='start-dev.sh' \
  --exclude='test-api.sh' \
  --exclude='composer.json' \
  --exclude='composer.lock' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.dev/' \
  --exclude='.git/' \
  --exclude='.DS_Store' \
  --exclude='*/.DS_Store' \
  --exclude='.gitignore' \
  --exclude='*/.gitignore' \
  --exclude='*.map' \
  --exclude='*/.map' \
  --exclude='vendor/**/README*' \
  --exclude='vendor/**/readme*' \
  --exclude='vendor/**/CHANGELOG*' \
  --exclude='vendor/**/changelog*' \
  --exclude='vendor/**/composer.json' \
  --exclude='vendor/phpmailer/phpmailer/SMTPUTF8.md' \
  --exclude='vendor/phpmailer/phpmailer/COMMITMENT' \
  --exclude='vendor/phpmailer/phpmailer/SECURITY.md' \
  --exclude='vendor/phpmailer/phpmailer/get_oauth_token.php' \
  "$BACKEND_DIR"/ "$STAGE_DIR/api"/

if [[ -f "$BACKEND_DIR/cache/.htaccess" ]]; then
  mkdir -p "$STAGE_DIR/api/cache"
  cp "$BACKEND_DIR/cache/.htaccess" "$STAGE_DIR/api/cache/.htaccess"
fi
if [[ -f "$BACKEND_DIR/uploads/.htaccess" ]]; then
  mkdir -p "$STAGE_DIR/api/uploads"
  cp "$BACKEND_DIR/uploads/.htaccess" "$STAGE_DIR/api/uploads/.htaccess"
fi

log "Creating site zip"
(cd "$STAGE_DIR" && zip -r "$SITE_ZIP" . -x '__MACOSX/*' -x '.DS_Store' -x '*/.DS_Store' -x '*.map' -x '*/.map')
rm -rf "$STAGE_DIR"

log "Zip summary"
ls -lh "$SITE_ZIP"
set +o pipefail
unzip -l "$SITE_ZIP" | head -n 35
set -o pipefail

ok "Created site-deploy.zip"
