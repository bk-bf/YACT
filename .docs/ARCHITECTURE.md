<!-- LOC cap: 470 (source: 4702, ratio: 0.10, updated: 2026-03-21) -->
# ARCHITECTURE

## System Overview

YACT now runs as split repositories in this workspace:
- yact-web: SvelteKit UI plus server routes that normalize backend REST data for the frontend
- yact-server: standalone backend services (coindata-server primary, analytics legacy during migration)

The web app is REST-client-first and expects a reachable backend at YACT_ANALYTICS_URL.

Implementation evidence:
- 0c467615280cef952e10bf261798596f2cb92b06: bootstrapped monorepo with web plus analytics runtime
- 468fb17380a620fbd0e146b1ab147db8e139d87d: removed in-repo analytics service from yact-web
- d463dca494aa740ba319f34ea261fe12cb54a5f8 (yact-server): initial standalone yact-server import

## Current Runtime Shape

- Frontend: Svelte 5 + SvelteKit routes and page components
- Web server routes: BFF-style endpoints under apps/web/src/routes/api/*
- Backend dependency: yact-server endpoints (/health, /api/v1/markets, /api/v1/headlines, /api/v1/coins/{id})
- Dev startup contract: scripts/dev-web.sh performs backend /health preflight and fails fast if unreachable

Implementation evidence:
- bdf9acd9d9e62d88405c1efc207442ded0617b19: added backend preflight in scripts/dev-web.sh
- 49cfa3c45b930dca728ec88ad4d2b47365328404: shifted snapshot handling toward backend API retrieval
- 3b466cf7183740e74f988ebfbf12c80feba9784e: removed persistent snapshot modules and switched web endpoints to analytics API

## Components

UI visual implementation is governed by .docs/UI_STYLE.md.
All frontend routes and reusable components should follow that file for color tokens, typography, spacing, and interaction semantics.

## Current Implemented Snapshot (2026-03-20)

Web/UI currently implemented:
- `/` markets page with top-100 table, 24h metrics, 7d sparklines, global market summary, and top headlines
- `/currencies/[id]` coin detail route with breakdown data, chart component, links, contracts, and derived summary sections
- `/watchlist` preview surface route with placeholder cards and TODO-tagged task links
- Separator-first control style (single-line dividers, reduced bubble usage)

Implementation evidence:
- 71c78620ccba529195907ae86e9eee284c812054: core markets page plus watchlist route baseline
- acd5ba344d6b9b35625ff0aea522b139bac7b581: coin breakdown route and server endpoint
- d4782f78c5982412efde00fe55aa0cd8003bf605: markets and snapshot metadata polling surfaces
- 8312181c97b8bd81bc9103d5c8e7eea34f003a74 and 1af96c404a16e4262291505719a6fb90cc837be3: initial shell plus derived-state data flow refinements

API currently implemented:
- `GET /api/markets` proxy/aggregation route backed by analytics REST
- `GET /api/coins/[id]` route returning normalized coin breakdown from analytics REST
- `GET /api/coins/[id]/chart?range=` route returning normalized chart payload
- Debug polling helpers:
	- `GET /api/debug/snapshot-meta` for snapshot timestamp checks
	- `GET /api/debug/auto-refresh` in disabled/deprecated mode (REST-only note)

Placeholder governance currently implemented:
- Placeholder UI comments are tagged as TODO(T-NNN, see .docs/features/open/ROADMAP.md)
- Task IDs map directly to open roadmap items for implementation tracking

## Data Flow

Markets flow:
1. SSR route load fetches `/api/markets` for first render.
2. Browser route navigation to `/` returns an immediate empty shell and defers recovery to post-mount fetch in the markets page view.
3. Shared shell polling (`/api/markets?_ts`, `/api/headlines?_ts`) updates sticky surfaces and emits `yact:markets-sync` browser events for page recovery handoff.
4. Sticky-bar global state uses meaningful-data guards to avoid zero-fallback regressions during hydration/navigation windows.

Incident note (2026-03-21): BUG-002 remains open only for intermittent transient zero-state regression during refresh/logo navigation windows. Compact-value oscillation is fixed.

Operational guardrail:
- Do not switch loading architecture modes (cache/no-cache, SSR/client branching, composable replacement) within the same incident unless the before/after evidence bundle confirms elimination of the prior overlap.

Coin detail flow:
1. Route load fetches critical coin payload (`/api/coins/{id}` + `/api/coins/{id}/chart?range=7d`) for first paint.
2. Client refresh uses abortable critical + auxiliary fetches and cancels immediately when leaving `/currencies/*`.
3. Headlines and markets auxiliary modules fetch asynchronously after critical payload update and merge progressively.
4. Auxiliary markets retries are intentionally lightweight to reduce contention with route transitions.
5. Loader-level in-memory TTL caching reduces repeat fetch pressure for hot endpoints during short navigation windows.

This progressive rendering approach ensures the coin price, name, and chart appear within ~50-100ms, while heavier auxiliary data (markets, headlines) fetches without blocking initial render.

Cache policy (web loader layer):
- `/api/coins/{id}`: 15s TTL (coin-detail context)
- `/api/coins/{id}/chart?range=7d`: 20s TTL (coin-detail context)
- `/api/markets` in coin-detail context: 20s TTL
- `/api/headlines` in coin-detail context: 30s TTL
- `/api/markets` on markets home page: module-level stale-while-revalidate with meaningful-data guard — no time expiry; cached result is returned instantly on SvelteKit navigation and revalidated in the background; cache expires only when the page module is unloaded (hard reload).

## Loading Indicator

`RouteProgress.svelte` is the shared top-of-page loading bar (purple, 3px).
It activates during SvelteKit route transitions (`$navigating`) and also shows briefly on initial page load/hard reload via a 500ms `$effect` timer. It is mounted once in `AppShellLayout.svelte`.

## Client Diagnostics

- Browser console is relayed to `POST /api/debug/client-logs` through `src/hooks.client.ts`.
- Global UI interaction events (click/submit/navigation start/end) are emitted as `[ui-event]` console entries from the shared layout.
- Incident capture automation is available via `scripts/capture-web-incident.sh`.

## Removed Legacy In Web Repo

Persistent snapshot/storage modules were removed from yact-web (for example, persistentCoinSnapshot, persistentMarketSnapshot, persistentDatabaseWrite, and in-web autoRefreshService).
Data persistence and mining now live in yact-server.

Implementation evidence:
- 3b466cf7183740e74f988ebfbf12c80feba9784e: deleted persistent modules and legacy in-web refresh service

## Deployment and Operations Notes

- yact-web local checks: scripts/check.sh
- yact-web dev: scripts/dev-web.sh [optional_api_url]
- yact-server runtime operations are handled in the server repo and can be run remotely via SSH/systemd workflows

## Boundaries

- yact-web does not run miner/scheduler persistence locally anymore.
- yact-web should not couple to backend internals; it consumes stable REST contracts only.
