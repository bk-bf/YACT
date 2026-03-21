<!-- LOC cap: 82 (source: 410, ratio: 0.20, updated: 2026-03-19) -->
# PHILOSOPHY

## Product Thesis

Most crypto tools are dashboards for data display, not interpretation.
This product treats interpretation as a first-class feature through explicit analytical lenses and transparent probability outputs.

## Target User Profile

Primary users:
- Self-directed retail researchers
- Systematic discretionary traders
- Crypto-native users who already use multiple tools and want one integrated analysis layer

Secondary users:
- Small funds and newsletter operators needing repeatable framework outputs

## Design Principles

1. Interpretability over opacity
- Every signal must include how it was computed.

2. Probability, not certainty
- Outputs are probabilistic and always paired with confidence and sample size.

3. Frameworks as selectable lenses
- Users should switch perspective intentionally (cycle, momentum, bear-survival, etc).

4. Composability over one-model dogma
- Multiple lenses can overlap and disagree.

5. Transparent uncertainty
- Sparse historical data must reduce confidence visibly.

6. Open-source core
- Methods should be auditable and forkable.

7. Build for utility first
- Personal daily usefulness is the first quality filter.

## Scope Constraints

In scope for MVP:
- Halving cycle lens
- Metric hit-rate scorecards
- Watchlist lens application
- Lens overlap visualization

Out of scope for MVP:
- Full automated Elliott Wave labeling
- Execution bots or auto-trading
- High-frequency intraday prediction
- Institutional compliance workflows

## UX Direction

- TradingView-like trading terminal visual language
- Deep black surfaces as primary background context
- Neon-green highlight color for primary actions and positive market semantics
- Dense-but-readable information architecture
- Defaults that explain signal context, not only metric values
- Fast interaction loops for coin-to-coin comparison
- Detailed implementation tokens and component rules are defined in `.docs/UI_STYLE.md`

## Risk Posture

- Avoid deterministic language about future price
- Keep confidence calibration conservative
- Expose historical drift when metric behavior changes over time

## Success Definition

The product succeeds if users can answer:
- Which signals matter right now for this asset?
- How reliable have these signals been historically?
- What changes when I switch analytical lens?
