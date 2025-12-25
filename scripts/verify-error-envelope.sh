#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-"http://localhost:5001/api"}

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
  local expected_status=$4
  local payload=${5:-}

  local body_file="${WORK_DIR}/${label// /_}.json"
  local curl_args=(-sS -o "${body_file}" -w "%{http_code}" -X "${method}" "${API_BASE}${path}")
  if [[ -n "${payload}" ]]; then
    curl_args+=(-H 'Content-Type: application/json' -d "${payload}")
  fi

  echo "[verify] ${label}"
  local http_status
  http_status=$(curl "${curl_args[@]}")

  python3 - "${expected_status}" "${http_status}" "${body_file}" <<'PY'
import json, sys, pathlib
expected = int(sys.argv[1])
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

if data["status"] != expected or http_status != expected:
    print(f"  ✗ Status mismatch: http={http_status}, body={data['status']}, expected={expected}")
    sys.exit(1)

print(f"  ✓ {data.get('error', 'OK')} (requestId={data['requestId']})")
PY
}

prime_lock_user() {
  local username=$1
  for _ in {1..6}; do
    curl -sS -o /dev/null -X POST "${API_BASE}/login" -H 'Content-Type: application/json' -d "{\"username\":\"${username}\",\"password\":\"wrong\"}" || true
  done
}

check_endpoint "login invalid creds" POST "/login" 401 '{"username":"invalid_user","password":"wrong"}'
prime_lock_user "locked_user"
check_endpoint "login locked" POST "/login" 429 '{"username":"locked_user","password":"wrong"}'
check_endpoint "jobs validation" POST "/jobs" 400 '{"name":"","email":"","phone":""}'
check_endpoint "contact validation" POST "/contact" 400 '{"name":"","email":"","message":""}'
check_endpoint "reservations validation" POST "/reservations" 400 '{"name":"","email":"","date":""}'
check_endpoint "404 probe" GET "/definitely-not-real" 404

echo "[verify-error-envelope] All checks passed"
