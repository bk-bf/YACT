<!-- LOC cap: 470 (source: 4702, ratio: 0.10, updated: 2026-03-21) -->
# PHILOSOPHY

## Product Thesis

YACT Web is a fast, operator-friendly market terminal that consumes backend REST snapshots and keeps UI behavior predictable under unstable upstream conditions.

## Target User Profile

Primary users:
- Operators and developers validating mining freshness and UI correctness
- Users monitoring top markets and coin detail metrics with low-friction navigation
- Teams debugging data-quality regressions using incident capture and console relay

Secondary users:
- Contributors extending UI routes and BFF proxy behavior

## Design Principles

1. Route responsiveness first
- Navigation must remain fast even when API calls are slow or aborted.

2. Non-regressive state updates
- Never replace known-good market UI state with empty fallback payloads.

3. Progressive rendering over blocking
- Critical data first, auxiliary panels later, with explicit loading boundaries.

4. REST contract discipline
- Web should consume stable backend contracts without duplicating persistence logic.

5. Diagnostics by default
- Console relay, debug endpoints, and incident bundles are first-class tools.

6. Small, reversible changes
- During incidents, apply minimal patches with before/after evidence.

7. Scripted local workflow
- Prefer repository scripts for dev, checks, and incident capture.

## Scope Constraints

In scope for MVP:
- Markets home page and coin detail route correctness
- Sticky topbar/global summary behavior and headlines surfacing
- Watchlist workspace route and core shell navigation
- Debug/incident workflows for runtime regressions

Out of scope for MVP:
- Trading execution or portfolio automation
- On-web persistence/mining ownership (lives in yact-server)
- Institutional compliance workflows

## UX Direction

- Terminal-style information density with readable hierarchy
- Stable numeric formatting across SSR and client hydration
- Fast route transitions with visible progress cues
- Clear separation between shell-level and page-level state ownership
- Detailed implementation tokens and component rules are defined in `.docs/UI_STYLE.md`

## Risk Posture

- Assume intermittent upstream/API variability and canceled browser requests
- Prefer safe fallback rendering without masking true state regressions
- Treat hydration/navigation race conditions as high-severity UX defects

## Success Definition

The web app succeeds when users and operators can answer:
- Is navigation immediate across markets and coin routes?
- Are displayed market values stable and non-regressive?
- Can regressions be diagnosed quickly from local logs and capture bundles?
