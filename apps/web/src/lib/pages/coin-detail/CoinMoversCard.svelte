<script lang="ts">
    import type { HighlightCoin } from "./coin-detail-page.data";
    import { percent } from "../../utils/formatters";

    const { topGainers }: { topGainers: HighlightCoin[] } = $props();
</script>

<article class="coin-rail-card">
    <h3>Market Movers</h3>
    <ul class="coin-movers-list">
        {#each topGainers.slice(0, 3) as mover}
            <li>
                <a href={`/currencies/${mover.id}`}>{mover.name}</a>
                <span
                    class={mover.priceChangePercentage24h >= 0 ? "positive" : "negative"}
                >
                    {percent.format(mover.priceChangePercentage24h / 100)}
                </span>
            </li>
        {/each}
    </ul>
</article>
