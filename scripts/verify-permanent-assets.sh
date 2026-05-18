#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MANIFEST="$ROOT_DIR/docs/permanent-assets.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "[permanent-assets][error] missing docs/permanent-assets.json" >&2
  exit 1
fi

node "$ROOT_DIR/scripts/verify-permanent-assets.mjs" "$MANIFEST" "$ROOT_DIR"
