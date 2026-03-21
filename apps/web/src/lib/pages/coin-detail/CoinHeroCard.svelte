<script lang="ts">
    import type { CoinBreakdown } from "./coin-detail-page.data";
    import { usd, percent } from "../../utils/formatters";

    const { coin }: { coin: CoinBreakdown } = $props();
</script>

<article class="coin-rail-card coin-hero-card">
    <div class="coin-terminal-identity">
        <div class="coin-title-wrap">
            <img src={coin.image} alt={coin.name} width="40" height="40" />
            <h1>
                <span class="coin-title-name">{coin.name}</span>
                <span class="coin-title-symbol">{coin.symbol.toUpperCase()}</span>
            </h1>
        </div>
        <span class="coin-rank-pill">#{coin.marketCapRank}</span>
    </div>

    <div class="coin-terminal-price">
        <strong>{usd.format(coin.currentPrice)}</strong>
        <span
            class={coin.priceChangePercentage24h >= 0 ? "positive" : "negative"}
        >
            {percent.format(coin.priceChangePercentage24h / 100)}
        </span>
    </div>
</article>
