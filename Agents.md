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
- **Mandatory post-change web probe**: after each yact-web code change, verify live HTTP response with curl against the active dev URL (default `http://localhost:5173`), at minimum for `/` and the route changed.
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
5. Document a state-ownership map for the affected UI (route loader vs page state vs layout polling).
6. Correlate UI symptoms with relay logs, ownership map, and endpoint payloads.
7. Classify incident: client-runtime, proxy-route, upstream-api, config/env, unknown.
8. Apply the smallest fix and repeat the same capture to confirm resolution.
9. After every code change, run curl probes to confirm non-500 responses from the active web URL (default `http://localhost:5173`) before reporting success.

Workflow guardrail:
- Do not switch loading architecture modes (for example, cache strategy plus SSR/client branching plus composable replacement) in the same incident without a before/after evidence bundle that proves the prior race/regression is removed.

Use this minimal incident bundle command when investigating:

```bash
cd /home/ubuntu/server/yact/yact-web
./scripts/capture-web-incident.sh
```

## .github routing

- For prompts/skills/automation related to web work, use files under `yact-web/.github/`.
- Do not use `yact-server/.github/` for web-only tasks.

## Local scripts

- `./scripts/dev-web.sh` — starts the Svelte web app dev server.
- `./scripts/check.sh` — runs the full check pipeline: `svelte-check` → `knip` → `vitest`.

## CI / check pipeline (`./scripts/check.sh`)

The pipeline runs three stages in order:

| Stage | Tool | What it checks |
| --- | --- | --- |
| `lint:web` | `svelte-check` | TypeScript types + Svelte-specific diagnostics across all `.svelte` and `.ts` source files. Fails on any error. |
| `ci:knip` | `knip` | Unused exports, dead files, and undeclared/missing dependencies across the monorepo. Config lives in `knip.json` at the repo root. |
| `test:web` | `vitest` | Unit tests matching `src/**/*.{test,spec}.{js,ts}`. Passes with no files when no tests are written yet (`--passWithNoTests`). |

**Key files:**
- `knip.json` — knip workspace config (root-level).
- `apps/web/vite.config.ts` — imports from `vitest/config`; includes `test.environment: 'jsdom'`.
- `apps/web/package.json` — `lint` runs `svelte-check`, `test` runs `vitest run --passWithNoTests`.
- `apps/web/tsconfig.json` — includes `"node"` in `types` for `process.env` in server routes.

**Adding tests:** drop `*.test.ts` or `*.spec.ts` files anywhere under `apps/web/src/`. Vitest picks them up automatically.

**ESLint note:** ESLint is intentionally skipped — `svelte-check` covers Svelte-specific and TypeScript diagnostics, and the Svelte VS Code extension provides in-editor lint feedback. Add ESLint only if rule-based lint gates become necessary.
