#!/usr/bin/env bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="/tmp/yact-web-incident-${TS}"
BASE_URL="${1:-http://127.0.0.1:5173}"
COIN_ID="${2:-bitcoin}"

mkdir -p "$OUT"

echo "timestamp_utc=$TS"
echo "base_url=$BASE_URL"
echo "output_dir=$OUT"

curl -sS "$BASE_URL/api/debug/client-logs?limit=300" > "$OUT/client-logs.json" || true
curl -sS "$BASE_URL/api/debug/snapshot-meta" > "$OUT/debug-snapshot-meta.json" || true
curl -sS "$BASE_URL/api/debug/auto-refresh" > "$OUT/debug-auto-refresh.json" || true
curl -sS "$BASE_URL/api/markets" > "$OUT/api-markets.json" || true
curl -sS "$BASE_URL/api/headlines" > "$OUT/api-headlines.json" || true

curl -sS -o /dev/null -w "markets code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}\n" "$BASE_URL/api/markets?_ts=$(date +%s%N)" > "$OUT/timing-markets.txt" || true
curl -sS -o /dev/null -w "snapshot-meta code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}\n" "$BASE_URL/api/debug/snapshot-meta?_ts=$(date +%s%N)" > "$OUT/timing-snapshot-meta.txt" || true
curl -sS -o /dev/null -w "headlines code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}\n" "$BASE_URL/api/headlines?_ts=$(date +%s%N)" > "$OUT/timing-headlines.txt" || true

curl -sS -I "$BASE_URL/" > "$OUT/probe-home.txt" || true
curl -sS -I "$BASE_URL/currencies/$COIN_ID" > "$OUT/probe-coin.txt" || true

printf '{"capturedAt":"%s","baseUrl":"%s","coinId":"%s"}\n' "$TS" "$BASE_URL" "$COIN_ID" > "$OUT/meta.json"

echo "incident_bundle=$OUT"
