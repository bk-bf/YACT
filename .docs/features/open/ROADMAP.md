<!-- LOC cap: 678 (source: 6778, ratio: 0.10, updated: 2026-03-20) -->
# ROADMAP

## Open

Manual-first rule for all open tasks:
- Each task must define one direct UI/API check that can be run locally immediately.

TODO mapping rule for placeholder code:
- Use `TODO(T-NNN, see .docs/features/open/ROADMAP.md): ...` so every placeholder links to a roadmap task.

### Phase 1 - Core Navigation + Coin Breakdown First (Week 1)

- [ ] **T-017**: Wire topbar menu and market filter controls to real destinations
  - Deliverables: route-backed topbar items, filter state and URL wiring, and visible non-placeholder destination content
  - Manual verification: click every topbar item and primary market filter; each must navigate or update state with visible content change
  - Exit criteria: zero dead buttons in primary topbar and "Top 100 Cryptocurrencies By Market Cap" filter controls

### Phase 2 - Runnable Web Loop Expansion (Week 1)

- [ ] **T-004**: Add watchlist CRUD with persistence
  - Deliverables: add/remove coin interactions, persisted watchlist state, optimistic UI updates
  - Manual verification: add 2+ coins, refresh browser, confirm watchlist state persists and can be edited
  - Exit criteria: watchlist operations are visible, interactive, and persistent in local run mode

### Phase 3 - Halving Lens (Weeks 2-3)

- [ ] **T-003**: Build halving cycle computation engine and surface it in UI
  - Deliverables: cycle phase model, per-coin cycle endpoint, cycle badge/overlay in coin detail view
  - Manual verification: open coin detail and confirm cycle phase/badge updates from live endpoint data
  - Exit criteria: deterministic cycle output is visible in the web UI and reproducible for test coins

### Phase 4 - Probability Engine (Weeks 3-5)

- [ ] **T-005**: Implement rolling metric backtest runner
  - Deliverables: trigger definitions, horizon return calculations, stored hit-rate outputs per metric
  - Manual verification: run backtest command locally and inspect generated output for at least one coin/metric pair
  - Exit criteria: backtest run is repeatable and output schema is stable

- [ ] **T-006**: Add probability scorecard screen
  - Deliverables: per-metric probability, confidence, and sample-size cards
  - Manual verification: open scorecard for a coin and confirm each metric row displays probability + confidence + sample size
  - Exit criteria: scorecard is user-visible and driven by real engine output, not static mock data

### Phase 5 - Lens Profiles (Weeks 5-7)

- [ ] **T-007**: Implement lens schema and application logic
  - Deliverables: lens model, built-in lens presets, apply-lens control at coin/watchlist level
  - Manual verification: switch lens in UI and confirm displayed metrics and weighting context change immediately
  - Exit criteria: lens switching produces observable data/context changes across views

- [ ] **T-008**: Implement lens overlap analysis view
  - Deliverables: alignment/conflict scoring and overlap panel
  - Manual verification: activate two lenses and confirm overlap panel highlights agreement/conflict states
  - Exit criteria: overlap behavior is visible and understandable from UI alone

### Phase 6 - Deploy + OSS Handoff (Week 8+)

- [ ] **T-010**: Deploy MVP to Vercel plus analytics host
  - Deliverables: staging URLs, env templates, health checks
  - Manual verification: open deployed web URL, call deployed health endpoint, confirm both are reachable
  - Exit criteria: public staging environment mirrors key local flows

- [ ] **T-011**: Publish open-source docs and contributor path
  - Deliverables: setup docs, local run steps, contribution checklist
  - Manual verification: fresh clone on clean machine can run web + analytics using docs only
  - Exit criteria: first-time contributor can reproduce runnable local environment end to end

## Deferred

- [ ] **T-012**: Automated Elliott Wave profile support
- [ ] **T-013**: Advanced derivatives/funding-rate lens packs
- [ ] **T-014**: Strategy alerting and notification center
- [ ] **T-015**: Managed SaaS billing and tenant administration

## Bug Cross-Reference Index

- See [../../bugs/BUGS.md](../../bugs/BUGS.md) for active and closed bug reports.
- Reference roadmap task IDs in bug entries when applicable.

## Done

- [x] **2026-03-19** T-000: Initial docs baseline created and aligned with project thesis.
- [x] **2026-03-19** T-001: Bootstrapped monorepo structure with SvelteKit app, FastAPI service skeleton, shared schema package, local run scripts, and CI lint/test stubs. (evidence: 0c467615280cef952e10bf261798596f2cb92b06)
- [x] **2026-03-19** T-002: Connected CoinGecko adapter to a normalized SvelteKit endpoint and shipped a visible top-100 market list with global market summary, sparkline charts, and resilient fallback handling. (evidence: 71c78620ccba529195907ae86e9eee284c812054)
- [x] **2026-03-19** T-009: Applied TradingView-like dark baseline theme and iterated to separator-first controls, unified market filters, and reusable shell styling across markets and watchlist routes. (evidence: df28687005e3dd0db0bbeab430d498421433d2bb, 09b259209bd58e613c7a88d8a9d2f2c03dcc14fd)
- [x] **2026-03-19** T-016: Implemented coin breakdown pages and routing from market rows with dynamic coin route and working market-row click-through. (evidence: acd5ba344d6b9b35625ff0aea522b139bac7b581)
