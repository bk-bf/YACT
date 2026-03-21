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
- `scripts/capture-web-incident.sh [base_url] [coin_id]`: capture a timestamped incident bundle under `/tmp/yact-web-incident-*`

## Active Known Issue (2026-03-21)

- Markets route (`/`) may still show transient flicker during hydration or coin->home navigation:
  - compact-value style oscillation (`$2.5T` then `$2.50T`)
  - temporary zero/empty regression before recovery
- Track status and investigation details in `BUGS.md` and `.docs/bugs/BUGS.md` (BUG-002).

## Debugging Workflow (Required)

To avoid repeated architecture churn during incident response:

1. Capture one timestamped evidence bundle before patching:
	- preferred: `./scripts/capture-web-incident.sh`
	- or manual probes for `/api/markets`, `/api/debug/snapshot-meta`, `/api/headlines`, `/api/debug/client-logs?limit=300`
2. Document state ownership map for affected UI region:
	- route loader state
	- page-local mutation paths
	- layout polling assignments
3. Apply the smallest fix that preserves one owner-of-truth for the impacted state.
4. Re-run the same bundle and compare event order/values before marking fixed.

