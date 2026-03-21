<!-- LOC cap: 678 (source: 6778, ratio: 0.10, updated: 2026-03-21) -->
# BUGS

## Open

### BUG-002: Markets hydration/navigation flicker (value-style oscillation and transient zero-state)
- **Status**: Open
- **Severity**: High
- **First appeared**: 2026-03-21
- **Related roadmap task**: None
- **Area**: UI
- **Summary**: Markets route can still flicker during hydration and coin->home navigation, including temporary regression to zero-valued cards and compact-value display oscillation (`$2.5T` / `$2.50T`).
- **Reproduction steps**:
  1. Open `/currencies/bitcoin`.
  2. Click logo to navigate back to `/`.
  3. Observe market summary cards and compact reference line for first 1-3s.
  4. Repeat with hard reload and inspect network order for `/api/markets`, `/api/debug/snapshot-meta`, `/api/headlines`, `/api/debug/client-logs`.
- **Expected**: Stable first paint from route data with no zero-state regression and no compact-value oscillation.
- **Actual**: Transient state/style oscillation remains despite prior cache removal and route-loader unification attempts.
- **Root cause (working hypothesis)**: Overlapping ownership of market-facing state across route payload, page-level update paths, and app-shell polling assignments.
- **Fix plan**:
  1. Produce one event timeline with payload provenance from loader to rendered assignment.
  2. Enforce single owner for market summary state during hydration window.
  3. Move secondary poll-driven updates behind explicit freshness gates and non-regressive merge rules.
  4. Re-verify with identical probe bundle before/after patch.

## Closed

### BUG-001: MAX range persisted YTD-like series from web-side fallback snapshots
- **Status**: Closed
- **Severity**: High
- **First appeared**: 2026-03-19
- **Fixed**: 2026-03-20
- **Related roadmap task**: None
- **Area**: Data
- **Summary**: MAX chart data could collapse to YTD-like density when web-local fallback series were persisted as canonical snapshot ranges.
- **Expected**: MAX should represent full available history and not be overwritten by short fallback series.
- **Actual (historical)**: Web-local persistence could store short fallback data for MAX when upstream fetches degraded.
- **Root cause (historical)**: yact-web contained in-repo persistence and fallback snapshot logic that could persist degraded chart ranges.
- **Resolution**: Architecture moved to REST-only data consumption in yact-web and removed web-local persistence/snapshot modules.
- **Evidence commits**:
  1. 49cfa3c45b930dca728ec88ad4d2b47365328404 (snapshot handling moved toward analytics API)
  2. 3b466cf7183740e74f988ebfbf12c80feba9784e (persistent snapshot modules removed from yact-web)
- **Verification notes**:
  1. yact-web no longer contains persistentCoinSnapshot/persistentMarketSnapshot/persistentDatabaseWrite modules.
  2. yact-web no longer stores chart snapshots under apps/web/.cache.
  3. Chart persistence ownership now lives in yact-server; new MAX/YTD integrity issues should be tracked there.

## Bug Report Template

Use this template for new entries:

### BUG-XXX: Short title
- **Status**: Open | Closed
- **Severity**: Low | Medium | High | Critical
- **First appeared**: YYYY-MM-DD
- **Fixed**: YYYY-MM-DD (if closed)
- **Related roadmap task**: T-NNN (if applicable)
- **Area**: UI | API | Analytics | Data | Infra
- **Summary**: One paragraph describing user-visible impact
- **Reproduction steps**:
  1. Step one
  2. Step two
  3. Step three
- **Expected**: Expected behavior
- **Actual**: Observed behavior
- **Root cause**: Optional, after investigation
- **Fix plan**: Optional, before implementation
