#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC_DIR="$ROOT_DIR/frontend/public"
HTACCESS="$PUBLIC_DIR/.htaccess"
APP_FILE="$ROOT_DIR/frontend/src/PublicApp.js"

for file in 403.html 404.html 500.html 503.html error-pages.css; do
  [[ -f "$PUBLIC_DIR/$file" ]] || { echo "Missing public error page asset: $file" >&2; exit 1; }
done

for file in 403.html 404.html 500.html 503.html; do
  grep -Fq 'Thunder Road Bar & Grill' "$PUBLIC_DIR/$file"
  grep -Fq 'href="/"' "$PUBLIC_DIR/$file"
done

grep -Fq 'ErrorDocument 403 /403.html' "$HTACCESS"
grep -Fq 'ErrorDocument 404 /404.html' "$HTACCESS"
grep -Fq 'ErrorDocument 500 /500.html' "$HTACCESS"
grep -Fq 'ErrorDocument 503 /503.html' "$HTACCESS"
grep -Fq 'maintenance.enable' "$HTACCESS"
grep -Fq 'RewriteRule ^ - [R=404,L]' "$HTACCESS"

grep -Fq "/status/access-denied" "$APP_FILE"
grep -Fq "/status/server-error" "$APP_FILE"
grep -Fq "/status/maintenance" "$APP_FILE"

echo "Public error-page verification passed"
