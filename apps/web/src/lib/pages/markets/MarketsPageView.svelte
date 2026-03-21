<script lang="ts">
    import { browser } from "$app/environment";
    import {
        createPriceJitter,
        isCoinJitterEligible,
    } from "../../effects/usePriceJitter.svelte";
    import { createHoverGlow } from "../../effects/useHoverGlow.svelte";
    import { useMarketsDataRecovery } from "../../composables/useMarketsDataRecovery.svelte";
    import MarketOverviewPanel from "./MarketOverviewPanel.svelte";
    import MarketFilterBar from "./MarketFilterBar.svelte";
    import CoinTableRow from "./CoinTableRow.svelte";
    import {
        createEmptyMarketsPageData,
        hasMeaningfulMarketsPayload,
        type MarketsPageData,
    } from "./markets-page.data";

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

    type OverviewStyleVariant = "separate" | "unified" | "minimal";

    const overviewStyleOptions: Array<{
        value: OverviewStyleVariant;
        label: string;
    }> = [
        { value: "separate", label: "Separate Bubbles" },
        { value: "unified", label: "One Bubble" },
        { value: "minimal", label: "Flat Black" },
    ];

    let overviewStyle = $state<OverviewStyleVariant>("separate");
</script>

<svelte:head>
    <title>YACT Top 100 Markets</title>
</svelte:head>

<div
    class="market-overview-style-switcher"
    role="toolbar"
    aria-label="Overview style variants"
>
    {#each overviewStyleOptions as option}
        <button
            type="button"
            class:active={overviewStyle === option.value}
            class="table-filter-item market-overview-style-toggle"
            aria-pressed={overviewStyle === option.value}
            onclick={() => {
                overviewStyle = option.value;
            }}
        >
            {option.label}
        </button>
    {/each}
</div>

<MarketOverviewPanel {viewData} {jitter} {hover} {overviewStyle} />

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
                    {#each viewData.coins as coin}
                        <CoinTableRow {coin} {jitter} />
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    <p class="market-footnote">Live source: {viewData.source}</p>
</section>
