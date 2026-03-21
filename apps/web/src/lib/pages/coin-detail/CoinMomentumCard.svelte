<script lang="ts">
    import type { CoinBreakdown } from "./coin-detail-page.data";

    const { coin }: { coin: CoinBreakdown } = $props();

    function clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    const bullishShare = $derived(
        clamp(Math.round(50 + coin.priceChangePercentage24h * 4), 5, 95),
    );
    const bearishShare = $derived(100 - bullishShare);
</script>

<article class="coin-rail-card">
    <h3>24h Price Momentum</h3>
    <div
        class="sentiment-bar"
        aria-label="Bullish vs bearish momentum from 24h price change"
    >
        <span class="sentiment-positive" style={`width: ${bullishShare}%`}>
            {bullishShare}%
        </span>
        <span class="sentiment-negative" style={`width: ${bearishShare}%`}>
            {bearishShare}%
        </span>
    </div>
</article>
