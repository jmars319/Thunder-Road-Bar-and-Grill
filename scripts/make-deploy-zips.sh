#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ZIP="$ROOT_DIR/deploy-backend.zip"
FRONTEND_ZIP="$ROOT_DIR/deploy-frontend.zip"

log() { printf '\033[1;32m[MAKE]\033[0m %s\n' "$*"; }
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

if [[ ! -d "$FRONTEND_DIR/build" || ! -f "$FRONTEND_DIR/build/index.html" ]]; then
  log "frontend/build missing; running npm run build"
  (cd "$FRONTEND_DIR" && npm run build)
fi

log "Creating backend zip"
(
  cd "$BACKEND_DIR"
  zip -r "$BACKEND_ZIP" . \
    -x 'uploads/*' 'uploads/**' \
       'incoming/*' 'incoming/**' \
       'cache/*' 'cache/**' \
       'logs/*' 'logs/**' \
       '*.log' '**/*.log' \
       '.env' '.env.*' \
       '.dev/*' '.dev/**' \
       '.git/*' '.git/**' \
       '.DS_Store' '**/.DS_Store' \
       '.vscode/*' '.vscode/**'

  # Add back only the safety placeholders we want to ship (empty cache dir + deny listing)
  if [[ -f 'cache/.gitignore' ]]; then
    zip -u "$BACKEND_ZIP" 'cache/.gitignore'
  fi
  if [[ -f 'cache/.htaccess' ]]; then
    zip -u "$BACKEND_ZIP" 'cache/.htaccess'
  fi
)

log "Creating frontend zip"
(
  cd "$FRONTEND_DIR/build"
  zip -r "$FRONTEND_ZIP" . \
    -x '.DS_Store' '**/.DS_Store'
)

log "Zip summaries"
ls -lh "$BACKEND_ZIP" "$FRONTEND_ZIP"
unzip -l "$BACKEND_ZIP" | head -n 20
unzip -l "$FRONTEND_ZIP" | head -n 20

log "Sanity check: backend zip should not include runtime cache/log artifacts"
if unzip -l "$BACKEND_ZIP" | rg -q 'cache/(error-alerts|ratelimit)|cache/email-previews\.log|logs/|logs/app\.log'; then
  err "Backend zip includes runtime cache/log artifacts (cache/, logs/, previews). Fix exclusions before deploying."
  exit 1
fi
