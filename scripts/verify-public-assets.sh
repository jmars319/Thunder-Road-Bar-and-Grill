#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

stale_pattern_base="$(printf 'og-%sx%s' '1200' '1200')"
stale_pattern_wild="$(printf 'og-%s.*1200x%s' '' '1200')"
forbidden_www="$(printf 'www.%s' 'trbgmidway.com')"

fail() {
  printf '[verify-public-assets] %s\n' "$1" >&2
  exit 1
}

assert_single_file() {
  rel="$1"
  name="$(basename "$rel")"
  matches=$(find frontend/public -type f -name "$name")
  printf '%s' "$matches" | grep -qx "$rel" || fail "Expected $rel but found: ${matches:-none}"
}

check_index_ref() {
  pattern="$1"
  label="$2"
  grep -q "$pattern" frontend/public/index.html || fail "index.html missing $label reference"
}

check_manifest_ref() {
  pattern="$1"
  label="$2"
  grep -q "$pattern" frontend/public/manifest.json || fail "manifest.json missing $label reference"
}

# OG assets
assert_single_file frontend/public/og/og-image-1200x630-with-badge.png
assert_single_file frontend/public/og/og-1024x1024.png

check_index_ref 'og-image-1200x630-with-badge.png' 'primary OG'
check_index_ref 'og-1024x1024.png' 'square OG'
check_index_ref 'twitter:image' 'twitter meta'

# Ensure no stale OG filenames linger
if grep -R --exclude 'verify-public-assets.sh' --exclude-dir node_modules "$stale_pattern_base" frontend backend docs scripts >/dev/null 2>&1; then
  fail "Found disallowed ${stale_pattern_base} reference"
fi
if grep -R --exclude 'verify-public-assets.sh' --exclude-dir node_modules "$stale_pattern_wild" frontend backend docs scripts >/dev/null 2>&1; then
  fail "Found disallowed ${stale_pattern_wild} reference"
fi

# Favicon assets
for file in \
  frontend/public/favicon.ico \
  frontend/public/favicon-16x16.png \
  frontend/public/favicon-32x32.png \
  frontend/public/favicon-48x48.png \
  frontend/public/apple-touch-icon.png \
  frontend/public/android-chrome-192x192.png \
  frontend/public/android-chrome-512x512.png \
  frontend/public/mstile-150x150.png \
  frontend/public/safari-pinned-tab.svg
do
  assert_single_file "$file"
done

check_index_ref 'favicon-16x16.png' 'favicon 16x16'
check_index_ref 'favicon-32x32.png' 'favicon 32x32'
check_index_ref 'favicon-48x48.png' 'favicon 48x48'
check_index_ref 'apple-touch-icon.png' 'apple-touch-icon'
check_index_ref 'mstile-150x150.png' 'ms tile meta'
if grep -q 'safari-pinned-tab.svg' frontend/public/index.html; then
  check_index_ref 'safari-pinned-tab.svg' 'safari pinned tab icon'
fi

check_manifest_ref 'android-chrome-192x192.png' 'manifest 192 icon'
check_manifest_ref 'android-chrome-512x512.png' 'manifest 512 icon'

if grep -R --exclude-dir node_modules "$forbidden_www" frontend backend docs scripts >/dev/null 2>&1; then
  fail "Found forbidden www-domain reference"
fi

printf '[verify-public-assets] OK\n'
