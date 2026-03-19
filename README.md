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
- `apps/analytics`: FastAPI analytics service skeleton
- `packages/shared-schemas`: shared JSON schema package
- `docs`: product and project documentation

## Local run scripts

- `npm run dev:web`: start the SvelteKit app
- `make dev-analytics`: start the FastAPI service via `uv run`
- `make lint`: run workspace lint stubs
- `make test`: run workspace test stubs
- `scripts/check.sh`: run lint/test checks in one command

## Python environment (uv)

- Install `uv` once on your machine.
- Bootstrap analytics dependencies:
	- `cd apps/analytics && uv sync --extra dev`
- Run analytics commands through uv (already wired in `make` and `scripts/`).

