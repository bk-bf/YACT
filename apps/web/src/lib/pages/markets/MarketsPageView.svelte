<script lang="ts">
    import { browser } from "$app/environment";
    import { getContext } from "svelte";
    import {
        createPriceJitter,
        isCoinJitterEligible,
    } from "../../effects/usePriceJitter.svelte";
    import { createHoverGlow } from "../../effects/useHoverGlow.svelte";
    import { useMarketsDataRecovery } from "../../composables/useMarketsDataRecovery.svelte";
    import {
        VIEW_SETTINGS_KEY,
        type ViewSettings,
    } from "../../composables/useViewSettings.svelte";
    import MarketOverviewPanel from "./MarketOverviewPanel.svelte";
    import MarketFilterBar from "./MarketFilterBar.svelte";
    import CoinTableRow from "./CoinTableRow.svelte";
    import {
        createEmptyMarketsPageData,
        hasMeaningfulMarketsPayload,
        type MarketsPageData,
    } from "./markets-page.data";

    const settings = getContext<ViewSettings>(VIEW_SETTINGS_KEY);

    // Ownership contract (BUG-002):
    // - This view renders route-owned payload only.
    // - Structural fallback is allowed for safety, but this component must not
    //   perform its own markets polling/refresh writes.
    // - Exception: bounded recovery retries are allowed only when route payload
    //   is empty, to avoid persistent zero-state lockups after slow navigation.
    // - Shared layout polling can update shell surfaces, not page-owned state.
    const fallbackData = createEmptyMarketsPageData();
    let { data }: { data: MarketsPageData } = $props();
    let recoveredData = $state<typeof fallbackData | null>(null);

    // Safeguard: ensure data has required structure, falling back if any field is missing.
    const viewData = $derived(
        (recoveredData ?? data) &&
            (recoveredData ?? data).coins &&
            (recoveredData ?? data).global &&
            (recoveredData ?? data).highlights &&
            (recoveredData ?? data).highlights.trending !== undefined &&
            (recoveredData ?? data).highlights.topGainers !== undefined
            ? (recoveredData ?? data)
            : fallbackData,
    );

    // Data-lifecycle effects: recovery retries, shell sync, stale-tab refresh.
    useMarketsDataRecovery(
        () => data ?? fallbackData,
        () => recoveredData,
        (next) => {
            recoveredData = next;
        },
    );

    // Live price jitter — reactive entry list tracks viewData reactively.
    const jitter = createPriceJitter();
    const hover = createHoverGlow();

    // Progressive row rendering: render the first 20 rows immediately (above
    // the fold) then expand to all rows over two animation frames. This lets
    // the browser paint the visible table as soon as data arrives rather than
    // blocking on all 100 rows. renderedCount resets on component mount, so
    // each fresh navigation re-batches from the top.
    let renderedCount = $state(20);
    $effect(() => {
        const total = viewData.coins.length;
        if (total === 0 || renderedCount >= total) return;
        const raf = requestAnimationFrame(() => {
            renderedCount = Math.min(renderedCount + 40, total);
        });
        return () => cancelAnimationFrame(raf);
    });

    $effect(() => {
        if (!browser) return;

        const coinEntries = viewData.coins
            .filter(isCoinJitterEligible)
            .map((c) => ({ id: c.id, value: c.currentPrice }));

        const macroEntries = [
            {
                id: "globalMarketCap",
                value: viewData.global.totalMarketCapUsd,
                scale: "macro" as const,
            },
            {
                id: "globalVolume",
                value: viewData.global.totalVolumeUsd,
                scale: "macro" as const,
            },
        ];

        return jitter.start([...coinEntries, ...macroEntries]);
    });
</script>

<svelte:head>
    <title>YACT Top 100 Markets</title>
</svelte:head>

<MarketOverviewPanel
    {viewData}
    {jitter}
    {hover}
    overviewStyle={settings.overviewStyle}
    showPill={settings.showMarketCapPill}
/>

<section class="market-section">
    <h2 class="m3-surface-title">Top 100 Cryptocurrencies By Market Cap</h2>
    {#if viewData.error}
        <p class="error-text">Unable to load market data: {viewData.error}</p>
    {:else}
        <MarketFilterBar />

        <div class="market-table-wrap">
            <table class="market-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Coin</th>
                        <th>Price</th>
                        <th>24h</th>
                        <th>7d</th>
                        <th>Market Cap</th>
                        <th>Volume (24h)</th>
                        <th>Circulating Supply</th>
                    </tr>
                </thead>
                <tbody>
                    {#each viewData.coins.slice(0, renderedCount) as coin}
                        <CoinTableRow {coin} {jitter} />
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    <p class="market-footnote">Live source: {viewData.source}</p>
</section>
