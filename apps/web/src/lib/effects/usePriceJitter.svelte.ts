/**
 * usePriceJitter — CMC-style live price flicker composable (Svelte 5)
 *
 * Provides reactive state for simulated real-time price micro-updates,
 * matching the visual feel of live exchange tickers without backend changes.
 *
 * Stablecoin detection: skips USDT, USDC, DAI and similar pegged assets,
 * as well as any coin priced near $1 with sub-0.6% 24h movement.
 *
 * Scales:
 *   'coin'  — individual asset prices ($10–$100k range)
 *   'macro' — market-cap / volume in the billions/trillions range (±~700 000 nudge)
 *
 * Usage inside a Svelte component:
 *
 *   const jitter = createPriceJitter();
 *
 *   $effect(() => {
 *       if (!browser) return;
 *       return jitter.start([
 *           ...viewData.coins.filter(isCoinJitterEligible).map(c => ({
 *               id: c.id, value: c.currentPrice,
 *           })),
 *           { id: 'globalMarketCap', value: viewData.global.totalMarketCapUsd, scale: 'macro' },
 *           { id: 'globalVolume',    value: viewData.global.totalVolumeUsd,    scale: 'macro' },
 *       ]);
 *   });
 */

// Well-known stablecoin symbols whose prices must not flicker.
const STABLE_SYMBOLS = new Set([
    'usdt', 'usdc', 'dai', 'busd', 'tusd', 'usdp', 'gusd', 'frax', 'lusd',
    'susd', 'usdd', 'usds', 'pyusd', 'crvusd', 'fdusd', 'eurc', 'usdx',
]);

export type JitterScale = 'coin' | 'macro';

export interface JitterEntry {
    id: string;
    value: number;
    scale?: JitterScale;
    /** Milliseconds before the first tick. Defaults to random 500–7 500 ms. */
    initialDelay?: number;
}

function isStablecoin(symbol: string, price: number, change: number): boolean {
    return (
        STABLE_SYMBOLS.has(symbol.toLowerCase()) ||
        (Math.abs(price - 1) < 0.025 && Math.abs(change) < 0.6)
    );
}

/**
 * Returns true if the coin's price should receive jitter ticks.
 * Excludes stablecoins and sub-$1 assets (fractional prices look odd with nudges).
 */
export function isCoinJitterEligible(coin: {
    symbol: string;
    currentPrice: number;
    priceChangePercentage24h: number;
}): boolean {
    return (
        !isStablecoin(coin.symbol, coin.currentPrice, coin.priceChangePercentage24h) &&
        coin.currentPrice >= 1
    );
}

/**
 * Nudges a numeric value by a small random amount appropriate for its scale.
 */
export function nudgeValue(value: number, scale: JitterScale = 'coin'): number {
    if (scale === 'macro') {
        // Market-cap / volume: shift last 5–6 digits (±~700 000)
        return Math.max(0, value + Math.round((Math.random() * 2 - 1) * 700_000));
    }
    if (value >= 10_000) return Math.max(0.01, value + Math.round((Math.random() * 2 - 1) * 18));
    if (value >= 1_000)  return Math.max(0.01, value + Math.round((Math.random() * 2 - 1) * 4));
    if (value >= 100)    return Math.max(0.01, Math.round((value + (Math.random() * 2 - 1) * 0.9) * 100) / 100);
    if (value >= 10)     return Math.max(0.01, Math.round((value + (Math.random() * 2 - 1) * 0.12) * 100) / 100);
    return Math.max(0.001, Math.round((value + (Math.random() * 2 - 1) * 0.015) * 1000) / 1000);
}

/**
 * Creates a reactive price-jitter state manager.
 *
 * Must be called synchronously during a Svelte component's script initialisation
 * (same constraint as $state / $derived). The `start` function should be called
 * inside a `$effect` in the consuming component; the returned stop function should
 * be the `$effect`'s return value for automatic cleanup on component destroy.
 */
export function createPriceJitter() {
    let _values = $state<Record<string, number>>({});
    let _flash   = $state<Record<string, 'up' | 'down' | ''>>({});

    function tick(
        id: string,
        baseValue: number,
        scale: JitterScale,
        cancelRef: { cancelled: boolean },
    ): void {
        setTimeout(() => {
            if (cancelRef.cancelled) return;
            const current = _values[id] ?? baseValue;
            const next    = nudgeValue(current, scale);
            const dir: 'up' | 'down' = next >= current ? 'up' : 'down';
            _values[id] = next;
            _flash[id]  = dir;
            setTimeout(() => { if (!cancelRef.cancelled) _flash[id] = ''; }, 480);
            tick(id, next, scale, cancelRef);
        }, 4_000 + Math.random() * 9_500);
    }

    function start(entries: JitterEntry[]): () => void {
        const cancelRef = { cancelled: false };
        for (const e of entries) {
            const delay = e.initialDelay ?? (500 + Math.random() * 7_000);
            setTimeout(() => {
                if (!cancelRef.cancelled) {
                    tick(e.id, e.value, e.scale ?? 'coin', cancelRef);
                }
            }, delay);
        }
        return () => { cancelRef.cancelled = true; };
    }

    return {
        /** Reactive map of jitter-adjusted values, keyed by entry id. */
        get values(): Record<string, number> { return _values; },
        /** Reactive map of flash direction ('up' | 'down' | ''), keyed by id. */
        get flash(): Record<string, 'up' | 'down' | ''>  { return _flash; },
        /** Begin jittering the given entries. Returns a stop/cleanup function. */
        start,
        /** Current jitter-adjusted value or `fallback` if not yet ticked. */
        getValue(id: string, fallback: number): number {
            return _values[id] ?? fallback;
        },
        /** Current flash direction for an entry ('up' | 'down' | ''). */
        getFlash(id: string): 'up' | 'down' | '' {
            return (_flash[id] ?? '') as 'up' | 'down' | '';
        },
    };
}
