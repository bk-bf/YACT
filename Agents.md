<!-- LOC cap: 180 (updated: 2026-03-20) -->
# Agents.md — AI coding agent reference for yact-web

## Agent rules

- **Never commit or push to git unprompted.** Always wait for the user to explicitly ask, or for a slash command (e.g. `/commit`) to trigger it.
- **Date format**: always use `YYYY-MM-DD` (e.g. `2026-03-20`).
- **One branch at a time**: only make changes to the branch the user specifies.
- **TypeScript-first policy**: use TypeScript for app and package code unless tooling requires JavaScript.
- **Svelte-first policy**: for `.svelte` and route work, follow this repository's conventions and keep components/routes strongly typed.
- **Use repository scripts first**: prefer `./scripts/dev-web.sh` and `./scripts/check.sh` over ad-hoc commands.
- **Avoid unnecessary dev server restarts**: if Vite is healthy, rely on hot reload.
- **Repository boundary**: do not edit files under `../yact-server/` unless explicitly requested.

## Troubleshooting Protocol

When diagnosing web bugs, collect independent evidence before patching code.

Required evidence sources:
- Dev server/runtime state (`./scripts/dev-web.sh`, terminal status).
- Browser-console relay logs from `/api/debug/client-logs`.
- Debug endpoint state from `/api/debug/snapshot-meta` and `/api/debug/auto-refresh`.
- API proxy behavior from web routes under `/api/*`.

Required workflow:
1. Capture UTC timestamp and context (branch, commit SHA, host, browser URL).
2. Confirm dev server state and capture current terminal output.
3. Capture browser-console relay tail via `/api/debug/client-logs`.
4. Capture debug endpoints and web API proxy responses at the same timestamp.
5. Correlate UI symptoms with relay logs and endpoint payloads.
6. Classify incident: client-runtime, proxy-route, upstream-api, config/env, unknown.
7. Apply fix and repeat the same capture to confirm resolution.

Use this minimal incident bundle command when investigating:

```bash
#!/usr/bin/env bash
set -euo pipefail

TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="/tmp/yact-web-incident-${TS}"
mkdir -p "$OUT"

cd /home/ubuntu/server/yact/yact-web

curl -sS "http://127.0.0.1:5173/api/debug/client-logs?limit=300" > "$OUT/client-logs.json" || true
curl -sS "http://127.0.0.1:5173/api/debug/snapshot-meta" > "$OUT/debug-snapshot-meta.json" || true
curl -sS "http://127.0.0.1:5173/api/debug/auto-refresh" > "$OUT/debug-auto-refresh.json" || true
curl -sS "http://127.0.0.1:5173/api/markets" > "$OUT/api-markets.json" || true

echo "incident_bundle=$OUT"
```

## .github routing

- For prompts/skills/automation related to web work, use files under `yact-web/.github/`.
- Do not use `yact-server/.github/` for web-only tasks.

## Local scripts

- `./scripts/dev-web.sh` — starts the Svelte web app dev server.
- `./scripts/check.sh` — runs repository lint/test checks.
