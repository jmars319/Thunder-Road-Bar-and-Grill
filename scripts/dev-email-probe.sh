#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-"http://localhost:5001/api"}
PREVIEW_LOG="backend/cache/email-previews.log"
TMP_FILE=$(mktemp)
trap 'rm -f "$TMP_FILE"' EXIT

php_env_value() {
  php -r "require 'backend/utils/Config.php'; ${1}"
}

APP_ENV_SHELL=${APP_ENV:-}
APP_ENV_RAW=$(php_env_value 'echo getenv("APP_ENV") ?: "";')
APP_ENV_CONFIG=$(php_env_value 'echo Config::get("APP_ENV", getenv("APP_ENV") ?: "");')
if [[ "$APP_ENV_SHELL" == "production" || "$APP_ENV_RAW" == "production" || "$APP_ENV_CONFIG" == "production" ]]; then
  echo "[dev-email-probe] Refusing to run in production environment."
  exit 1
fi

mkdir -p "$(dirname "$PREVIEW_LOG")"
touch "$PREVIEW_LOG"
rm -f backend/cache/error-alerts/*.cache 2>/dev/null || true

PREVIEW_ENABLED=$(php_env_value 'echo (Config::getBool("EMAIL_PREVIEW_LOG", false) ? "true" : "false");')
echo "[dev-email-probe] APP_ENV (shell): ${APP_ENV_SHELL:-"(unset)"}"
echo "[dev-email-probe] APP_ENV (getenv via PHP): ${APP_ENV_RAW}"
echo "[dev-email-probe] APP_ENV (Config): ${APP_ENV_CONFIG}"
echo "[dev-email-probe] EMAIL_PREVIEW_LOG (Config): ${PREVIEW_ENABLED}"

file_size() {
  if [[ -f "$PREVIEW_LOG" ]]; then
    wc -c < "$PREVIEW_LOG" | tr -d ' '
  else
    echo 0
  fi
}

file_state() {
  python3 - "$PREVIEW_LOG" <<'PY'
import os, sys
path = sys.argv[1]
try:
    st = os.stat(path)
except FileNotFoundError:
    print("0|0")
else:
    print(f"{st.st_size}|{int(st.st_mtime)}")
PY
}

CURRENT_SIZE=$(file_size)
STATE_BEFORE="0|0"
STATE_AFTER="0|0"

record_state() {
  STATE_BEFORE=$(file_state)
  SIZE_BEFORE=$(file_size)
}

refresh_state() {
  STATE_AFTER=$(file_state)
  SIZE_AFTER=$(file_size)
  CURRENT_SIZE=$SIZE_AFTER
}

read_new_entries() {
  if (( SIZE_AFTER > SIZE_BEFORE )); then
    tail -c +"$((SIZE_BEFORE + 1))" "$PREVIEW_LOG" > "$TMP_FILE"
    return 0
  fi
  > "$TMP_FILE"
  return 1
}

fail_no_preview() {
  echo "[dev-email-probe] $1" >&2
  exit 1
}

expect_entry() {
  local channel=$1 to=$2 from=$3
  python3 - "$channel" "$to" "$from" "$TMP_FILE" <<'PY'
import json, sys, pathlib
expected_channel, expected_to, expected_from, path = sys.argv[1:5]
text = pathlib.Path(path).read_text().strip()
if not text:
    sys.exit("No preview entries found when one was expected.")
entries = [json.loads(line) for line in text.splitlines() if line.strip()]
entry = entries[-1]
missing = []
if entry.get("channel") != expected_channel:
    missing.append(f"channel {entry.get('channel')} != {expected_channel}")
if entry.get("to") != expected_to:
    missing.append(f"to {entry.get('to')} != {expected_to}")
if entry.get("from") != expected_from:
    missing.append(f"from {entry.get('from')} != {expected_from}")
if missing:
    sys.exit(" | ".join(missing))
print(json.dumps(entry, indent=2))
PY
}

assert_preview_written() {
  local label=$1 channel=$2 to=$3 from=$4
  if [[ "$STATE_BEFORE" == "$STATE_AFTER" ]]; then
    if [[ "$PREVIEW_ENABLED" != "true" ]]; then
      fail_no_preview "EMAIL_PREVIEW_LOG is false per Config (no previews expected)."
    elif [[ ! -w "$PREVIEW_LOG" ]]; then
      fail_no_preview "Preview log path missing or not writable."
    else
      fail_no_preview "${label}: endpoint succeeded but no preview was written (possible Emailer gating bug)."
    fi
  fi
  read_new_entries || fail_no_preview "${label}: preview diff missing despite state change."
  expect_entry "$channel" "$to" "$from"
}

assert_no_preview_written() {
  local label=$1
  if [[ "$STATE_BEFORE" != "$STATE_AFTER" ]]; then
    read_new_entries || true
    fail_no_preview "${label}: unexpected preview entry written."
  fi
}

run_probe() {
  local label=$1
  shift
  record_state
  bash -c "$*"
  refresh_state
}

echo "[dev-email-probe] Contact form"
run_probe "Contact form" \
  "curl -sS -X POST '${API_BASE}/contact' -H 'Content-Type: application/json' \
    -d '{\"name\":\"Dev Contact\",\"email\":\"dev@example.com\",\"phone\":\"555-0000\",\"subject\":\"Probe\",\"message\":\"Contact test\\nLine two\"}' \
    | python3 -m json.tool"
assert_preview_written "Contact form" "ops" "thundergrillmidway@gmail.com" "no-reply@trbgmidway.com"

echo "[dev-email-probe] Job application"
run_probe "Job application" \
  "curl -sS -X POST '${API_BASE}/jobs' -H 'Content-Type: application/json' \
    -d '{\"name\":\"Dev Applicant\",\"email\":\"applicant@example.com\",\"phone\":\"555-1234\",\"position\":\"Line Cook\",\"availability\":\"Nights\",\"experience\":\"3 years\",\"cover_letter\":\"Ready to cook!\"}' \
    | python3 -m json.tool"
assert_preview_written "Job application" "ops" "thundergrillmidway@gmail.com" "no-reply@trbgmidway.com"

echo "[dev-email-probe] Reservation"
run_probe "Reservation" \
  "curl -sS -X POST '${API_BASE}/reservations' -H 'Content-Type: application/json' \
    -d '{\"name\":\"Reservation Tester\",\"email\":\"guest@example.com\",\"phone\":\"555-9999\",\"reservation_date\":\"2025-12-25\",\"reservation_time\":\"19:00\",\"number_of_guests\":4,\"special_requests\":\"Window seat\"}' \
    | python3 -m json.tool"
assert_preview_written "Reservation" "ops" "thundergrillmidway@gmail.com" "no-reply@trbgmidway.com"

echo "[dev-email-probe] 404 should not generate alerts"
run_probe "404" "curl -sS '${API_BASE}/definitely-not-real' | python3 -m json.tool || true"
assert_no_preview_written "404 probe"

echo "[dev-email-probe] Trigger 500 once"
run_probe "500" "curl -sS '${API_BASE}/dev/trigger-error' || true"
assert_preview_written "500 probe" "alert" "support@jamarq.digital" "alerts@trbgmidway.com"

echo "[dev-email-probe] Trigger 500 again (should throttle)"
run_probe "500 throttle" "curl -sS '${API_BASE}/dev/trigger-error' || true"
assert_no_preview_written "throttled 500 probe"

echo "[dev-email-probe] Completed. Preview log: ${PREVIEW_LOG}"
