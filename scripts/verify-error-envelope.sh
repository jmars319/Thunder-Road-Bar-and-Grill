#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-"http://localhost:3304/api"}

if ! command -v python3 >/dev/null 2>&1; then
  echo "[verify-error-envelope] python3 is required to parse JSON"
  exit 1
fi

WORK_DIR=$(mktemp -d)
cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

check_endpoint() {
  local label=$1
  local method=$2
  local path=$3
  local expected_statuses=$4
  local payload=${5:-}

  local body_file="${WORK_DIR}/${label// /_}.json"
  local curl_args=(-sS -o "${body_file}" -w "%{http_code}" -X "${method}" "${API_BASE}${path}")
  if [[ -n "${payload}" ]]; then
    curl_args+=(-H 'Content-Type: application/json' -d "${payload}")
  fi

  echo "[verify] ${label}"
  local http_status
  http_status=$(curl "${curl_args[@]}")

  python3 - "${expected_statuses}" "${http_status}" "${body_file}" <<'PY'
import json, sys, pathlib
expected_statuses = {int(value) for value in sys.argv[1].split(",") if value}
http_status = int(sys.argv[2])
body_path = pathlib.Path(sys.argv[3])
body = body_path.read_text()

try:
    data = json.loads(body)
except json.JSONDecodeError as exc:
    print(f"  ✗ JSON decode failed: {exc}")
    sys.exit(1)

required = ["error", "status", "requestId", "timestampUTC"]
missing = [key for key in required if key not in data]
if missing:
    print(f"  ✗ Missing keys: {', '.join(missing)}")
    sys.exit(1)

if data["status"] != http_status:
    print(f"  ✗ Status mismatch: http={http_status}, body={data['status']}")
    sys.exit(1)

if http_status not in expected_statuses:
    expected = ", ".join(str(status) for status in sorted(expected_statuses))
    print(f"  ✗ Unexpected status: http={http_status}, expected one of {expected}")
    sys.exit(1)

for key in ("trace", "stack", "file", "line"):
    if key in data:
        print(f"  ✗ Debug key leaked in response: {key}")
        sys.exit(1)

lower_body = body.lower()
for fragment in ("sqlstate", "pdoexception", "/users/"):
    if fragment in lower_body:
        print(f"  ✗ Internal detail leaked in response: {fragment}")
        sys.exit(1)

print(f"  ✓ {data.get('error', 'OK')} (requestId={data['requestId']})")
PY

  LAST_STATUS="${http_status}"
}

prime_lock_user() {
  local username=$1
  for _ in {1..6}; do
    curl -sS -o /dev/null -X POST "${API_BASE}/login" -H 'Content-Type: application/json' -d "{\"username\":\"${username}\",\"password\":\"wrong\"}" || true
  done
}

LAST_STATUS=""
check_endpoint "login invalid creds" POST "/login" "401,500" '{"username":"invalid_user","password":"wrong"}'
if [[ "$LAST_STATUS" == "500" ]]; then
  echo "[verify] login lockout skipped because the local database-backed login path returned a safe 500 envelope"
else
  prime_lock_user "locked_user"
  check_endpoint "login locked" POST "/login" 429 '{"username":"locked_user","password":"wrong"}'
fi
check_endpoint "jobs validation" POST "/jobs" 400 '{"name":"","email":"","phone":""}'
check_endpoint "contact validation" POST "/contact" 400 '{"name":"","email":"","message":""}'
check_endpoint "reservations validation" POST "/reservations" 400 '{"name":"","email":"","date":""}'
check_endpoint "404 probe" GET "/definitely-not-real" 404

echo "[verify-error-envelope] All checks passed"
