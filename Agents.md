<!-- LOC cap: 344 (source: 2457, ratio: 0.14, updated: 2026-03-09) -->
# Agents.md — AI coding agent reference for project documentation

## Agent rules

- **Never commit or push to git unprompted.** Always wait for the user to explicitly ask, or for a slash command (e.g. `/commit`) to trigger it. This applies even when completing a large task — finish all code changes, then stop and wait. The user may have staged changes of their own that must not be conflated into your commit.
- **Roadmap task references**: open tasks in `.docs/features/open/ROADMAP.md` are numbered `T-NNN` (e.g. `T-002`). When referencing a roadmap item in code comments, ADRs, bug notes, or commit messages, use the task number, not a description.
- **Date format**: always use `YYYY-MM-DD` (e.g. `2026-03-09`). Never use `YYYY-MM` alone. This applies everywhere: ADR `**Date**` fields, bug report `**First appeared**` / `**Fixed**` fields, roadmap `## Done` entries (`- [x] **YYYY-MM-DD**: ...`), LOC cap `updated:` comments, and archive filenames (`BUGS-YYYY-MM-DD.md`, `DECISIONS-YYYY-MM-DD.md`).
- **Archiving completed items**: never move completed roadmap items, closed bugs, or superseded ADRs to `.docs/features/archive/` unless the user explicitly asks. Completed items stay in their current file until the user requests archiving.
- **One branch at a time**: only make changes to the branch the user specifies. Never edit files in two code branches (e.g. `main/` and a `feature/` worktree)
- **TypeScript-first policy**: avoid JavaScript for application and shared package code. Use TypeScript by default for new files and migrations when practical. Keep JavaScript only where ecosystem/tooling requires it (for example specific config/runtime files).
- **Use Svelte skills for Svelte work**: when creating, editing, or reviewing `.svelte` files or SvelteKit routes/pages, load and follow `.github/skills/svelte-code-writer/SKILL.md` and `.github/skills/svelte-core-bestpractices/SKILL.md`.
- **No architecture content in this file.** This file is orientation only. All architecture detail lives in `.docs/` — see the reference section at the bottom. Do not add environment variables, pane layouts, plugin lists, isolation mechanisms, symlink maps, or boot/session sequences here. If you find yourself writing that kind of content, put it in `.docs/ARCHITECTURE.md` instead.
- **Use repository scripts first for local workflows**: prefer `./scripts/dev-web.sh` for web development, `./scripts/dev-analytics.sh` for analytics API development, and `./scripts/check.sh` for lint/test checks.
- **Never start `yact-server` locally**: do not run `./scripts/bootstrap.sh`, API, miner, or systemd/service commands for `yact-server` on the local machine. All `yact-server` runtime operations (init, daemon/start/stop/restart, redeploy, health checks) must be executed on the Ubuntu host via `ssh ubuntu`.
- **Avoid unnecessary dev server restarts**: if the web dev server is already running, rely on Vite hot reload instead of restarting. Keep using the active port/session unless the user explicitly asks to restart or the server is unhealthy.

## Documentation

All architecture detail lives in the `.docs/` worktree. 
Start here:

| File                                  | Contents                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `.docs/ARCHITECTURE.md`               | Environment isolation, boot sequence, pane layout, env vars, sync.lua, ignore rules, hot-reload, plugin lists |
| `.docs/features/open/ROADMAP.md`      | Open tasks (`T-NNN`), deferred items, and the bug cross-reference index                                       |
| `.docs/features/archive/ROADMAP-*.md` | Completed roadmap items archived by `/udoc`                                                                   |
| `.docs/DECISIONS.md`                  | Architecture Decision Records (ADR-001 … ADR-NNN)                                                             |
| `.docs/PHILOSOPHY.md`                 | Design principles, seam rule, target user profile, scope constraints                                          |
| `.docs/UI_STYLE.md`                   | Canonical UI visual language (TradingView-like dark terminal style, tokens, component semantics)              |
| `.docs/bugs/BUGS.md`                  | All bug reports and their status                                                                              |

## Local scripts

Use the project scripts in `scripts/` as the default entry points for daily workflows:

- `./scripts/dev-web.sh` — starts the Svelte web app dev server.
- `./scripts/dev-analytics.sh` — starts the analytics FastAPI dev server.
- `./scripts/check.sh` — runs repository lint/test checks.
