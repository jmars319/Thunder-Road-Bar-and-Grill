#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_SCRIPT="$ROOT_DIR/backend/test-api.sh"

if [[ ! -f "$BACKEND_SCRIPT" ]]; then
  echo "backend/test-api.sh not found. Are you on the latest branch?" >&2
  exit 1
fi

(
  cd "$ROOT_DIR/backend"
  bash ./test-api.sh
)
