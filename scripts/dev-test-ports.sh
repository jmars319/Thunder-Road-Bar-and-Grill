#!/usr/bin/env bash

# Automated tests use their own ports and runtime files so manual review stays
# available on the permanent dev ports.
ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

export DEV_DIR="${DEV_TEST_DIR:-$ROOT_DIR/.dev/test}"
export DEV_CONFIG_FILE="${DEV_CONFIG_FILE:-/dev/null}"
export BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
export FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
export BACKEND_PORT="${BACKEND_PORT:-4304}"
export FRONTEND_PORT="${FRONTEND_PORT:-4204}"
export REACT_APP_API_BASE="${REACT_APP_API_BASE:-/api}"
export VITE_API_BASE="${VITE_API_BASE:-$REACT_APP_API_BASE}"
export VITE_API_PROXY_TARGET="${VITE_API_PROXY_TARGET:-http://$BACKEND_HOST:$BACKEND_PORT}"
export DEV_BROWSER_OPEN="${DEV_BROWSER_OPEN:-0}"
