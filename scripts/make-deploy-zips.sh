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
  cd "$ROOT_DIR"
  zip -r "$BACKEND_ZIP" backend \
    -x 'backend/uploads/*' 'backend/uploads/**' \
       'backend/.env' 'backend/.env.*' \
       'backend/.dev/*' 'backend/.git/*' 'backend/.git/**' \
       'backend/.DS_Store' 'backend/**/*.DS_Store' \
       'backend/.vscode/*' 'backend/.vscode/**'
)

log "Creating frontend zip"
(
  cd "$ROOT_DIR"
  zip -r "$FRONTEND_ZIP" frontend/build \
    -x 'frontend/build/.DS_Store' 'frontend/build/**/*.DS_Store'
)

log "Zip summaries"
ls -lh "$BACKEND_ZIP" "$FRONTEND_ZIP"
unzip -l "$BACKEND_ZIP" | head -n 20
unzip -l "$FRONTEND_ZIP" | head -n 20
