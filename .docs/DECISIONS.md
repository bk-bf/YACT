<!-- LOC cap: 678 (source: 6778, ratio: 0.10, updated: 2026-03-20) -->
# DECISIONS

## ADR-001: Bootstrap Monorepo With Separate Web and Analytics Runtimes

**Date**: 2026-03-19  
**Status**: Accepted

**Implemented in commits**:
- 0c467615280cef952e10bf261798596f2cb92b06 (yact-web)

### Context
The project needed a runnable baseline with a TypeScript web UI and a Python analytics service in one workspace.

### Decision
Initialize yact-web with SvelteKit for UI/BFF routes and a Python analytics service scaffold.

### Consequences
- Pros: fast full-stack iteration, clear language/runtime boundaries
- Cons: cross-service contracts and dual tooling overhead

## ADR-002: Ship Coin Detail Route As First-Class Domain View

**Date**: 2026-03-19  
**Status**: Accepted

**Implemented in commits**:
- acd5ba344d6b9b35625ff0aea522b139bac7b581 (yact-web)

### Context
Top-100 markets list alone was insufficient for per-asset analysis workflows.

### Decision
Introduce dynamic coin routes and a dedicated breakdown page fed by server route normalization.

### Consequences
- Pros: stable information architecture for coin-focused workflows
- Cons: larger page data contract and more endpoint coordination

## ADR-003: Split Backend Out Of yact-web Into Standalone yact-server

**Date**: 2026-03-20  
**Status**: Accepted

**Implemented in commits**:
- 468fb17380a620fbd0e146b1ab147db8e139d87d (yact-web)
- d463dca494aa740ba319f34ea261fe12cb54a5f8 (yact-server)

### Context
Backend services needed portability, independent deployment, and remote operations separate from frontend work.

### Decision
Move backend code out of yact-web and establish yact-server as a standalone repository.

### Consequences
- Pros: clean ownership boundary, easier SSH/systemd deployment, safer web iteration
- Cons: introduces cross-repo versioning and integration coordination

## ADR-004: Enforce REST-Only Web Data Access Via Analytics API

**Date**: 2026-03-20  
**Status**: Accepted

**Implemented in commits**:
- 49cfa3c45b930dca728ec88ad4d2b47365328404 (yact-web)
- 3b466cf7183740e74f988ebfbf12c80feba9784e (yact-web)

### Context
yact-web still contained in-repo persistence and snapshot modules after backend split, creating duplicate data responsibilities.

### Decision
Remove persistent snapshot modules from yact-web and proxy coin/markets data from analytics REST endpoints.

### Consequences
- Pros: single source of truth for data persistence and mining
- Cons: web availability depends on backend API reachability

## ADR-005: Make Backend Reachability A Required Dev Preflight

**Date**: 2026-03-20  
**Status**: Accepted

**Implemented in commits**:
- bdf9acd9d9e62d88405c1efc207442ded0617b19 (yact-web)

### Context
After REST-only migration, starting the web app without a reachable backend created misleading local behavior.

### Decision
Update scripts/dev-web.sh to check analytics /health and fail fast when the backend URL is unreachable.

### Consequences
- Pros: explicit integration contract, fewer false frontend-only runs
- Cons: local frontend startup now requires backend availability (local or remote)

## ADR-006: Use Initial Route Shell + Client Refresh + Derived State Pattern

**Date**: 2026-03-20  
**Status**: Accepted

**Implemented in commits**:
- 8312181c97b8bd81bc9103d5c8e7eea34f003a74 (yact-web)
- 1af96c404a16e4262291505719a6fb90cc837be3 (yact-web)

### Context
Direct route load fetching and mutable page data patterns were causing fragility and made reactive update flows harder to reason about.

### Decision
Adopt a pattern where route loads return safe initial shells, then client-side refresh populates live data, with view state derived from initial plus live payloads.

### Consequences
- Pros: predictable hydration path, safer reactive updates, clearer stale-state handling
- Cons: requires explicit refresh orchestration and fallback normalization paths

## ADR-007: Hybrid Coin Detail Loading With Short-Lived Web Cache

**Date**: 2026-03-20  
**Status**: Accepted

### Context
Coin detail first paint was rendering placeholder values (`0`, `--`, and empty rail modules) while all data waited for client refresh. Measured page-load latency showed `/api/markets` variance and payload size were the dominant contributors to delayed right-rail population.

### Decision
Adopt a phased hybrid strategy for coin detail:
- Phase 1: SSR-load critical coin fields (`/api/coins/{id}` and chart) for first render while preserving non-blocking client navigation behavior.
- Phase 2: add in-memory TTL caching in web data loaders for hot endpoints (`/api/coins/{id}`, `/api/coins/{id}/chart`, `/api/markets`, `/api/headlines`) to reduce repeated fetch costs during short navigation windows.
- Phase 3: defer route-level stale-while-revalidate for `/api/markets` as a follow-up if p95 latency still degrades UX.

### Consequences
- Pros: materially better perceived first paint for coin core metrics, fewer repeated heavy fetches, less right-rail empty-state dwell time.
- Cons: short staleness window introduced by TTL cache, more nuanced server-vs-browser route behavior.

## ADR-008: Enforce Single Owner Of Route-Critical View State During Hydration

**Date**: 2026-03-21  
**Status**: Accepted

### Context
BUG-002 showed persistent markets flicker despite iterative fixes. Symptoms included transient zero-state regressions and compact-value display oscillation during hydration and coin->home navigation. Investigation indicated overlapping mutation paths for market-facing UI state.

### Decision
For route-critical data (example: markets summary on `/`), enforce one owner-of-truth path for first render and hydration:
- Route loader payload is canonical for the page view.
- Page-local polling/refresh must not independently replace the same payload during hydration.
- Layout/shared polling may update shell-only surfaces but cannot regress page-owned state.
- Every incident patch must include before/after evidence bundles with identical probes and timestamp correlation.

### Consequences
- Pros: fewer race conditions, deterministic render ownership, easier incident triage.
- Cons: less flexibility for ad-hoc optimization experiments during active incidents.
