#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/dev-backend-stop.sh" >/dev/null 2>&1 || true
bash "$SCRIPT_DIR/dev-backend-start.sh"
