<!-- LOC cap: 82 (source: 410, ratio: 0.20, updated: 2026-03-19) -->
# UI STYLE

## Visual Direction

Target aesthetic:
- Trading-terminal inspired layout and density
- Deep black background surfaces
- Neon green as the primary highlight and action color

This is not "minimal white dashboard" UI.
It should feel like a focused, pro trading workstation.

## Core Palette

Use these as baseline tokens:

- `--tv-bg`: `#050607`
- `--tv-surface-0`: `#0a0d0f`
- `--tv-surface-1`: `#101417`
- `--tv-surface-2`: `#161c20`
- `--tv-border`: `#202a2f`
- `--tv-text-primary`: `#d6e3dc`
- `--tv-text-muted`: `#90a39a`
- `--tv-highlight`: `#39ff14`
- `--tv-highlight-soft`: `#1ddf72`
- `--tv-negative`: `#ff4d57`
- `--tv-warning`: `#ffc247`

Accessibility constraint:
- Keep normal text contrast at or above WCAG AA against dark surfaces.

## Typography

Typography intent:
- Compact and legible for dense data
- Distinct hierarchy for symbol names, prices, and labels

Recommended baseline:
- Display/section headings: geometric or technical sans (semi-bold)
- Body/labels: neutral sans optimized for dashboard readability
- Numeric values: tabular/monospace variant where possible for alignment

Scale guidance:
- H1: 28-32px
- H2: 20-24px
- Body: 14-16px
- Data labels/chips: 12-13px

## Spacing and Density

Trading UI density target:
- Tight vertical rhythm
- High information throughput without visual clutter

Spacing baseline:
- `4, 8, 12, 16, 20, 24, 32`
- Table rows target: 40-48px height
- Card paddings: 12-20px depending on panel priority

## Reusable Surface and Controls

Required reusable primitives:
- Surface card (`default`, `elevated`, `tonal`)
- Primary button (neon-green emphasis)
- Secondary/outlined button
- Table with sticky header option
- Status chips (`positive`, `negative`, `neutral`)

Interaction states:
- Hover: subtle lift + border/lightness shift
- Active: slightly darker surface and reduced shadow
- Focus: visible outline using highlight tone with sufficient contrast

## Data Semantics

Color semantics:
- Positive movement and selected states use highlight green
- Negative movement uses red, never green variants
- Neutral values use muted gray-green text

Do not use highlight green for non-interactive decorative accents only.
It must preserve semantic meaning and action affordance.

## Layout Pattern

Primary shell:
- Top compact nav/toolbar
- Left or top watch context selector
- Main two-panel pattern for chart + metrics
- Secondary panel for watchlist and alerts

On mobile:
- Keep chart/primary data first
- Collapse secondary panels below fold
- Preserve dark theme and semantic colors

## Motion

Motion guidance:
- Fast and restrained (100-180ms transitions)
- No decorative animations unrelated to data/action
- Emphasize state transitions (loading, refresh, price direction change)

## Anti-Patterns

Avoid:
- Light backgrounds as primary surfaces
- Pastel accent palettes
- Large empty whitespace blocks
- Generic card-grid marketing look
- Overuse of glow effects that reduce readability

## Current Implemented UI Snapshot (2026-03-19)

Implemented homepage modules:
- Top headlines list with external source metadata and low-prominence expand/collapse control
- Market summary line plus global market stat cards
- Top-100 market table with per-row 7d sparkline and focus/hover row highlights
- Unified single filter row under the Top 100 heading

Implemented shell behavior:
- Compact top nav with reduced placeholder actions
- Route links integrated into main topbar row
- Source metadata rendered as subtle footnote in the market section

Placeholder tracking convention:
- UI placeholders use `TODO(T-NNN, see .docs/features/open/ROADMAP.md)` comments.
- New placeholder UI should follow the same task-linked TODO pattern.
