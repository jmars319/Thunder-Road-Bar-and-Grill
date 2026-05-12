#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ZIP="$ROOT_DIR/backend-deploy.zip"
FRONTEND_ZIP="$ROOT_DIR/frontend-deploy.zip"

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

log "Removing old deploy zips"
rm -f "$BACKEND_ZIP" "$FRONTEND_ZIP"

log "Running fresh frontend build (npm run build)"
(cd "$FRONTEND_DIR" && npm run build)

log "Creating backend zip"
(
  cd "$BACKEND_DIR"
  zip -r "$BACKEND_ZIP" . \
    -x 'uploads/*' 'uploads/**' \
       'incoming/*' 'incoming/**' \
       'cache/*' 'cache/**' \
       'logs/*' 'logs/**' \
       '*.log' '**/*.log' \
       'tests/*' 'tests/**' \
       'scripts/*' 'scripts/**' \
       'README.md' \
       'start-dev.sh' \
       'test-api.sh' \
       'composer.json' \
       'composer.lock' \
       'vendor/phpmailer/phpmailer/README.md' \
       'vendor/phpmailer/phpmailer/changelog.md' \
       'vendor/phpmailer/phpmailer/SMTPUTF8.md' \
       'vendor/phpmailer/phpmailer/COMMITMENT' \
       'vendor/phpmailer/phpmailer/SECURITY.md' \
       'vendor/phpmailer/phpmailer/composer.json' \
       'vendor/phpmailer/phpmailer/get_oauth_token.php' \
       '.env' '.env.*' \
       '.dev/*' '.dev/**' \
       '.git/*' '.git/**' \
       '.DS_Store' '**/.DS_Store' \
       '.gitignore' '**/.gitignore' \
       '*.map' '**/*.map' \
       '.vscode/*' '.vscode/**'
  # Add back only the deny-listing guard for the writable cache directory.
  if [[ -f 'cache/.htaccess' ]]; then
    zip -u "$BACKEND_ZIP" 'cache/.htaccess'
  fi
)

log "Creating frontend zip"
(
  cd "$FRONTEND_DIR/build"
  zip -r "$FRONTEND_ZIP" . \
    -x '.DS_Store' '**/.DS_Store' \
       '*.map' '**/*.map'
)

log "Zip summaries"
ls -lh "$BACKEND_ZIP" "$FRONTEND_ZIP"
# Temporarily disable pipefail so previewing with head doesn't cause a non-zero exit
set +o pipefail
unzip -l "$BACKEND_ZIP" | head -n 20
unzip -l "$FRONTEND_ZIP" | head -n 20
set -o pipefail

log "Sanity check: backend zip should not include runtime cache/log artifacts"
if unzip -l "$BACKEND_ZIP" | rg -q 'cache/(error-alerts|ratelimit)|cache/email-previews\.log|logs/|logs/app\.log'; then
  err "Backend zip includes runtime cache/log artifacts (cache/, logs/, previews). Fix exclusions before deploying."
  exit 1
fi

ok "Created backend-deploy.zip and frontend-deploy.zip"
