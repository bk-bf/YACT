# BUGS

## 2026-03-20 - Progressive rendering composable is now the default route-page pattern

- Status: fixed
- Area: web route pages and page views
- Pattern for future pages:
	- `+page.ts` returns an immediate fallback shape from a local `*.data.ts` constructor.
	- Route/page view uses `useProgressiveDataLoad(() => data)`.
	- Client mount calls `loadCritical(...)` for required data first and optionally `loadAuxiliary(...)` for non-blocking enrichments.
	- Async merges must be stale-safe (request-id guarded by the composable).
- Applied in current code:
	- Markets page view and coin detail page view.
	- Watchlist route `+page.svelte` with fallback loader and critical refresh.

## 2026-03-20 - Coin detail page blocked on slow market API before showing any real data

- Status: fixed
- Area: web coin detail route (`/currencies/{coin_id}`)
- Symptom: page appeared entirely blank until ~5.2s network completion; user perceived all content was blocked waiting for data.

### Root cause

- Client-side refresh used `Promise.all([coin, chart, markets, headlines])`, which blocked UI update until the slowest endpoint (`/api/markets` at 0.9-1.8s) completed.
- SSR HTML with critical coin data was rendered server-side, but client-side hydration and refresh operation caused the entire render update to block on markets latency.
- Results: coin price/name/chart didn't appear until 5+ seconds, even though yact-server had served the data within 50-100ms.

### Fix

- Refactored client refresh to use progressive rendering:
  - Load critical coin + chart data first (~50-80ms)
  - Update UI immediately (no blocking)
  - Fetch markets and headlines asynchronously in background
  - Merge data progressively as each completes
- Result: coin data appears within 50-100ms instead of 5.2s; markets and headlines follow without blocking initial render.

### Verification

- `./scripts/check.sh` passed after refactor.
- Web build successful.
- Timing check: coin detail route now responds in 24-58ms (vs previous ~1-2s+ gating on markets).
- Page shows real coin data immediately, rail sections populate asynchronously.

## 2026-03-20 - Coin detail first paint showed placeholder metrics and delayed rail population

- Status: fixed (phase 1 + phase 2 complete)
- Area: web coin detail route (`/currencies/{coin_id}`)
- Symptom: initial render showed placeholder values (`0`, `--`, empty `Latest`/`Market Movers`) and users perceived a long delay before real values appeared.

### Root cause

- Route load returned fallback-only shell for all renders, so SSR HTML did not include real coin metrics.
- Client hydration then fetched all dependencies; `/api/markets` latency variance and large payload often became the gating request.
- Even after headlines decoupling, first paint still appeared empty because critical coin fields were not SSR-populated.

### Fix

- Implemented hybrid route loading:
	- Server render now fetches critical coin data (`/api/coins/{id}` + chart) for first paint.
	- Browser transitions remain non-blocking by keeping immediate shell behavior client-side.
- Added lightweight in-memory TTL caching in coin-detail loaders:
	- `/api/coins/{id}` 15s
	- `/api/coins/{id}/chart` 20s
	- `/api/markets` 20s
	- `/api/headlines` 30s

### Verification

- `./scripts/check.sh` passed after implementation.
- SSR responses now include populated coin core fields when backend is healthy.
- Repeat navigations within TTL window reduce auxiliary fetch latency and lower empty-state dwell time.

## 2026-03-20 - Coin Detail right column headlines delayed/empty

- Status: fixed
- Area: web coin detail page (`/currencies/{coin_id}`)
- Symptom: right column (`Latest`) showed `No headlines available right now.` for up to 60+ seconds.

### Root cause

- Headlines were coupled to the web `/api/markets` route instead of being fetched independently.
- `/api/markets` has variable latency because it depends on slower market payload computation.
- Coin detail data loading used the markets payload for both highlights and headlines, so a markets timeout/slow response left headlines empty.

### Fix

- Added dedicated web endpoint: `/api/headlines`.
- Decoupled headline fetching from `/api/markets` in coin detail and app shell.
- Kept markets endpoint focused on market/global/highlights payload.
- Added auxiliary retry/backfill logic so right-column content recovers quickly when initial fetch is empty.

### Verification

- `./scripts/check.sh` passed.
- Web build passed.
- Post-fix timing checks showed `/api/headlines` responding fast and independently from `/api/markets`.
