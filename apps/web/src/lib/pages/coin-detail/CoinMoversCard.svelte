<script lang="ts">
    import type { HighlightCoin } from "./coin-detail-page.data";
    import { percent } from "../../utils/formatters";
    import CoinRailCard from "./CoinRailCard.svelte";

    const { topGainers }: { topGainers: HighlightCoin[] } = $props();
</script>

<CoinRailCard title="Market Movers">
    <ul class="coin-movers-list">
        {#each topGainers.slice(0, 3) as mover}
            <li>
                <a href={`/currencies/${mover.id}`}>{mover.name}</a>
                <span
                    class={mover.priceChangePercentage24h >= 0
                        ? "positive"
                        : "negative"}
                >
                    {percent.format(mover.priceChangePercentage24h / 100)}
                </span>
            </li>
        {/each}
    </ul>
</CoinRailCard>
