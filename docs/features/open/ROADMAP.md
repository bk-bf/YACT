<!-- LOC cap: 82 (source: 410, ratio: 0.20, updated: 2026-03-19) -->
# ROADMAP

## Open

Manual-first rule for all open tasks:
- Each task must define one direct UI/API check that can be run locally immediately.

### Phase 1 - Runnable Web Loop First (Week 1)

- [ ] **T-004**: Add watchlist CRUD with persistence
  - Deliverables: add/remove coin interactions, persisted watchlist state, optimistic UI updates
  - Manual verification: add 2+ coins, refresh browser, confirm watchlist state persists and can be edited
  - Exit criteria: watchlist operations are visible, interactive, and persistent in local run mode

### Phase 2 - Halving Lens (Weeks 2-3)

- [ ] **T-003**: Build halving cycle computation engine and surface it in UI
  - Deliverables: cycle phase model, per-coin cycle endpoint, cycle badge/overlay in coin detail view
  - Manual verification: open coin detail and confirm cycle phase/badge updates from live endpoint data
  - Exit criteria: deterministic cycle output is visible in the web UI and reproducible for test coins

### Phase 3 - Probability Engine (Weeks 3-5)

- [ ] **T-005**: Implement rolling metric backtest runner
  - Deliverables: trigger definitions, horizon return calculations, stored hit-rate outputs per metric
  - Manual verification: run backtest command locally and inspect generated output for at least one coin/metric pair
  - Exit criteria: backtest run is repeatable and output schema is stable

- [ ] **T-006**: Add probability scorecard screen
  - Deliverables: per-metric probability, confidence, and sample-size cards
  - Manual verification: open scorecard for a coin and confirm each metric row displays probability + confidence + sample size
  - Exit criteria: scorecard is user-visible and driven by real engine output, not static mock data

### Phase 4 - Lens Profiles (Weeks 5-7)

- [ ] **T-007**: Implement lens schema and application logic
  - Deliverables: lens model, built-in lens presets, apply-lens control at coin/watchlist level
  - Manual verification: switch lens in UI and confirm displayed metrics and weighting context change immediately
  - Exit criteria: lens switching produces observable data/context changes across views

- [ ] **T-008**: Implement lens overlap analysis view
  - Deliverables: alignment/conflict scoring and overlap panel
  - Manual verification: activate two lenses and confirm overlap panel highlights agreement/conflict states
  - Exit criteria: overlap behavior is visible and understandable from UI alone

### Phase 5 - Deploy + OSS Handoff (Week 8+)

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
- [x] **2026-03-19** T-001: Bootstrapped monorepo structure with SvelteKit app, FastAPI service skeleton, shared schema package, local run scripts, and CI lint/test stubs.
- [x] **2026-03-19** T-002: Connected CoinGecko adapter to a normalized SvelteKit endpoint and shipped a visible top-10 market list on the homepage with working hot-reload loop.
- [x] **2026-03-19** T-009: Applied M3 baseline theming with shared typography, color/spacing tokens, and reusable surface/button styles across markets and watchlist routes.
