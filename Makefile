SHELL := /bin/bash

.PHONY: dev-web dev-analytics lint test ci

dev-web:
	npm run dev:web

dev-analytics:
	cd apps/analytics && uv run uvicorn app.main:app --reload --port 8000

lint:
	npm run ci:lint
	cd apps/analytics && uv run python -m compileall app

test:
	npm run ci:test
	cd apps/analytics && uv run pytest -q tests

ci: lint test
