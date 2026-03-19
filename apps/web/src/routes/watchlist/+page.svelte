<script lang="ts">
    import M3Surface from "../../lib/components/M3Surface.svelte";
    import M3Button from "../../lib/components/M3Button.svelte";
</script>

<svelte:head>
    <title>YACT Watchlist Preview</title>
</svelte:head>

<M3Surface
    title="Watchlist Surface Preview"
    subtitle="This route exists to manually verify reusable M3 tokens and component styling across multiple pages."
    tonal={true}
>
    <div class="grid-two">
        <!-- TODO: Replace placeholder BTC card with real watchlist module fed by live data. -->
        <article class="m3-surface padded elevated">
            <h3>BTC Core Signals</h3>
            <p>
                Tracking halving-cycle context with baseline probability
                signals.
            </p>
            <!-- TODO: Replace placeholder metric chips with computed BTC indicators. -->
            <span class="metric-chip">Halving phase</span>
            <span class="metric-chip">MVRV</span>
            <span class="metric-chip">SOPR</span>
        </article>

        <!-- TODO: Replace placeholder ETH card with real watchlist module fed by live data. -->
        <article class="m3-surface padded">
            <h3>ETH Momentum Signals</h3>
            <p>
                Short-term trend and liquidity context for watchlist comparison.
            </p>
            <!-- TODO: Replace placeholder metric chips with computed ETH indicators. -->
            <span class="metric-chip">Volume</span>
            <span class="metric-chip">Funding rate</span>
            <span class="metric-chip">Exchange flows</span>
        </article>
    </div>

    <div class="m3-button-row" style="margin-top: 1rem;">
        <!-- TODO: Replace back navigation placeholder with final watchlist-to-markets flow. -->
        <M3Button href="/" tone="filled">Back To Markets</M3Button>
        <!-- TODO: Replace route-check placeholder with real watchlist refresh/sync action. -->
        <M3Button href="/watchlist" tone="outlined"
            >Refresh Route Check</M3Button
        >
    </div>
</M3Surface>
