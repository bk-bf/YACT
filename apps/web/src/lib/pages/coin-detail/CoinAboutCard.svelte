<script lang="ts">
    import type { CoinBreakdown } from "./coin-detail-page.data";

    const { coin }: { coin: CoinBreakdown } = $props();

    function formatDescription(text: string): string[] {
        return text
            .split(/\r?\n\r?\n+/)
            .map((p) => p.trim())
            .filter(Boolean);
    }
</script>

<article class="coin-about-card">
    <h3>{coin.name} Market Context</h3>
    {#if coin.description}
        {#each formatDescription(coin.description) as para}
            <p>{para}</p>
        {/each}
    {:else}
        <p class="muted">
            No description available from the current data source.
        </p>
    {/if}
</article>
