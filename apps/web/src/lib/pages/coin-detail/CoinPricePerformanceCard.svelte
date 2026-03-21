<script lang="ts">
    import type { CoinBreakdown } from "./coin-detail-page.data";
    import { usd, percent } from "../../utils/formatters";

    const { coin }: { coin: CoinBreakdown } = $props();

    const shortDate = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    });

    function formatDateShort(value: string | null): string {
        if (!value) return "--";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "--";
        return shortDate.format(date);
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    const low24h = $derived(coin.low24h ?? coin.currentPrice);
    const high24h = $derived(coin.high24h ?? coin.currentPrice);
    const dayRangeSpread = $derived(Math.max(0, high24h - low24h));
    const dayRangeProgress = $derived(
        dayRangeSpread > 0
            ? clamp(((coin.currentPrice - low24h) / dayRangeSpread) * 100, 0, 100)
            : 50,
    );
    const athDistancePct = $derived(
        coin.allTimeHigh > 0
            ? ((coin.currentPrice - coin.allTimeHigh) / coin.allTimeHigh) * 100
            : null,
    );
    const atlDistancePct = $derived(
        coin.allTimeLow > 0
            ? ((coin.currentPrice - coin.allTimeLow) / coin.allTimeLow) * 100
            : null,
    );
</script>

<article class="coin-rail-card">
    <h3>Price performance</h3>
    <div class="coin-range-head">
        <div>
            <small>Low (24h)</small>
            <strong>{usd.format(low24h)}</strong>
        </div>
        <div class="coin-range-head-right">
            <small>High (24h)</small>
            <strong>{usd.format(high24h)}</strong>
        </div>
    </div>
    <div class="coin-range-track" aria-label="24h range">
        <span class="coin-range-thumb" style={`left:${dayRangeProgress}%`}></span>
    </div>
    <ul class="coin-rail-list coin-performance-list">
        <li>
            <span>All-time high</span>
            <strong>{coin.allTimeHigh > 0 ? usd.format(coin.allTimeHigh) : "--"}</strong>
        </li>
        <li>
            <span>{formatDateShort(coin.allTimeHighDate)}</span>
            <strong
                class={athDistancePct !== null
                    ? athDistancePct >= 0
                        ? "positive"
                        : "negative"
                    : ""}
            >
                {athDistancePct !== null
                    ? percent.format(athDistancePct / 100)
                    : "--"}
            </strong>
        </li>
        <li>
            <span>All-time low</span>
            <strong>{coin.allTimeLow > 0 ? usd.format(coin.allTimeLow) : "--"}</strong>
        </li>
        <li>
            <span>{formatDateShort(coin.allTimeLowDate)}</span>
            <strong
                class={atlDistancePct !== null
                    ? atlDistancePct >= 0
                        ? "positive"
                        : "negative"
                    : ""}
            >
                {atlDistancePct !== null
                    ? percent.format(atlDistancePct / 100)
                    : "--"}
            </strong>
        </li>
    </ul>
    <a href={coin.coingeckoUrl} target="_blank" rel="noreferrer" class="coin-inline-link">
        See historical data <span aria-hidden="true">↗</span>
    </a>
</article>
