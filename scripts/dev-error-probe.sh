#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-"http://localhost:5001/api"}
PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi

curl_json() {
  local method=$1
  local url=$2
  shift 2
  echo "==> ${method} ${url}"
  local response
  response=$(curl -sS -X "${method}" "${url}" -H 'Content-Type: application/json' "$@" || true)
  if [[ -n "${PYTHON_BIN}" ]]; then
    printf '%s\n' "${response}" | ${PYTHON_BIN} -m json.tool 2>/dev/null || printf '%s\n' "${response}"
  else
    printf '%s\n' "${response}"
  fi
  echo
}

echo "[dev-error-probe] /api/login (bad credentials)"
curl_json POST "${API_BASE}/login" -d '{"username":"admin","password":"wrong"}' || true

echo "[dev-error-probe] /api/login (rate-limit attempt)"
for _ in {1..6}; do
  curl -s -o /dev/null -X POST "${API_BASE}/login" -H 'Content-Type: application/json' -d '{"username":"rateuser","password":"bad"}' || true
done
curl_json POST "${API_BASE}/login" -d '{"username":"rateuser","password":"bad"}' || true

echo "[dev-error-probe] /api/media logo upload block"
curl -sS -X POST "${API_BASE}/media" -F category=logo -F title=test-logo || true

echo "[dev-error-probe] 404 probe"
curl_json GET "${API_BASE}/definitely-not-real" || true
