<!-- LOC cap: 470 (source: 4702, ratio: 0.10, updated: 2026-03-21) -->
# BUGS

## Open

### BUG-002: Markets hydration/navigation flicker (value-style oscillation and transient zero-state)
- **Status**: Open (Monitoring)
- **Severity**: Low
- **First appeared**: 2026-03-21
- **Related roadmap task**: T-018
- **Area**: UI
- **Summary**: All primary symptoms resolved. Route-transition delay, compact-value oscillation, zero-state on hard reload, and frequent zero-state on logo navigation are all fixed. A rare residual zero-state flash on `/currencies/[id] -> /` navigation remains — occurs seldom enough that active investigation is deferred to monitoring.
- **Fixes applied (2026-03-21)**:
  1. Module-level stale-while-revalidate cache in `markets-page.data.ts` (`getMarketsDataCache`/`setMarketsDataCache`): serves cached meaningful data instantly on SvelteKit navigation and revalidates in the background.
  2. `hasMeaningfulGlobal` guard in `AppShellLayout.svelte`: shell sticky-bar state only updates when incoming data is meaningful; prevents empty fallback from overwriting good state.
  3. `RouteProgress.svelte` component: shared purple top-of-page loading bar active on route transitions and initial page load (500ms `$effect` timer).
- **Residual**: Very rare zero-state flash on `/currencies/[id] -> /` navigation only. Not reproducible on demand; guards are working in the vast majority of cases.
- **Monitoring condition**: Reopen and escalate severity if zero-state becomes reproducible on demand or occurs more than once per 20 navigations.

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
