#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_npm_script() {
  node -e "const scripts=require('./package.json').scripts||{}; process.exit(scripts[process.argv[1]] ? 0 : 1)" "$1"
}

run_if_present() {
  local script="$1"
  if has_npm_script "$script"; then
    npm run "$script"
  fi
}

echo "[test:static] Checking shell script syntax"
while IFS= read -r -d '' file; do
  bash -n "$file"
done < <(find "$ROOT_DIR/scripts" "$ROOT_DIR/backend" -type f -name '*.sh' -print0)

echo "[test:static] Checking PHP syntax"
while IFS= read -r -d '' file; do
  php -l "$file" >/dev/null
done < <(find "$ROOT_DIR/backend" "$ROOT_DIR/scripts" \( -path '*/vendor/*' -o -path '*/node_modules/*' -o -path '*/.dev/*' -o -path '*/uploads/*' \) -prune -o -type f -name '*.php' -print0)

run_if_present lint
run_if_present typecheck
run_if_present check:types
run_if_present lint:css
run_if_present check:permanent-assets
run_if_present check:public-assets
run_if_present check:public-errors

echo "[test:static] Static checks passed"
