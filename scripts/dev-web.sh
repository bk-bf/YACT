#!/usr/bin/env bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPTS_DIR}/.." && pwd)"
cd "$PROJECT_ROOT"

# Accept optional URL arg: ./scripts/dev-web.sh http://ubuntuserver:8000
if [[ $# -gt 0 ]]; then
	export YACT_ANALYTICS_URL="$1"
else
	export YACT_ANALYTICS_URL="${YACT_ANALYTICS_URL:-http://localhost:8000}"
fi

echo "[dev-web] using YACT_ANALYTICS_URL=${YACT_ANALYTICS_URL}"

# Fail fast if the backend API is unreachable so web dev always starts against a live REST source.
if command -v curl >/dev/null 2>&1; then
	if ! curl -fsS --max-time 5 "${YACT_ANALYTICS_URL}/health" >/dev/null; then
		echo "[dev-web] cannot reach analytics API at ${YACT_ANALYTICS_URL}" >&2
		echo "[dev-web] start yact-server first or pass correct URL:" >&2
		echo "[dev-web]   ./scripts/dev-web.sh http://<host>:8000" >&2
		exit 1
	fi
else
	echo "[dev-web] warning: curl not found, skipping API preflight check"
fi

npm run dev:web
