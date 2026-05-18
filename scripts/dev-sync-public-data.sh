#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$ROOT_DIR/.dev/public-data"
LIVE_API_BASE="${LIVE_API_BASE:-https://trbgmidway.com/api}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf '[dev-sync-public-data][ERROR] Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

fetch_json() {
  local name="$1"
  local url="$2"
  local tmp="$OUT_DIR/.${name}.tmp"
  local dest="$OUT_DIR/${name}.json"

  printf '[dev-sync-public-data] Fetching %s\n' "$url"
  curl -fsSL "$url" -o "$tmp"
  node -e "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8'))" "$tmp"
  mv "$tmp" "$dest"
}

require_cmd curl
require_cmd node
mkdir -p "$OUT_DIR"

fetch_json "menu" "${LIVE_API_BASE%/}/menu"
fetch_json "settings" "${LIVE_API_BASE%/}/settings"

printf '[dev-sync-public-data] Saved public snapshots under %s\n' "$OUT_DIR"
