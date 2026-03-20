# YACT

Cycle-aware crypto tracker and analysis workspace focused on lens-driven interpretation rather than raw metric display.

## What it does

YACT defines a product and documentation baseline for an AI-assisted crypto analysis platform.
The core concept is selectable analytical lenses (for example, halving-cycle and on-chain momentum) that produce probability outputs with explicit confidence and sample-size metadata.
It is designed for self-directed researchers and systematic crypto users who want watchlist-level context, not only charts.

## Scope boundary

YACT does not provide auto-trading execution and does not present deterministic price predictions.

## Monorepo layout

- `apps/web`: SvelteKit web app scaffold (Vercel-ready)
- `packages/shared-schemas`: shared JSON schema package
- `.docs`: product and project documentation

Backend services moved to the standalone `yact-server` repo. This web repo consumes backend data via REST using `YACT_ANALYTICS_URL`.

## Local run scripts

- `npm run dev:web`: start the SvelteKit app
- `./scripts/dev-web.sh [api_url]`: start web app with analytics API preflight (example: `./scripts/dev-web.sh http://ubuntuserver:8000`)
- `make lint`: run web and schema checks
- `make test`: run web and schema tests
- `scripts/check.sh`: run lint/test checks in one command

