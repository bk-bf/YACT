SHELL := /bin/bash

.PHONY: dev-web lint test ci

dev-web:
	./scripts/dev-web.sh

lint:
	npm run ci:lint

test:
	npm run ci:test

ci: lint test
