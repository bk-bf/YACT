#!/usr/bin/env bash
set -euo pipefail

cd apps/analytics
uv run uvicorn app.main:app --reload --port 8000
