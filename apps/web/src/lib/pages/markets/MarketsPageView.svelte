<script lang="ts">
    import { browser } from "$app/environment";
    import { getContext } from "svelte";
    import {
        createPriceJitter,
        isCoinJitterEligible,
    } from "../../effects/usePriceJitter.svelte";
    import { createHoverGlow } from "../../effects/useHoverGlow.svelte";
    import { createTextTransition } from "../../effects/useTextTransition.svelte";
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

    // Table sort state.
    type SortKey =
        | "rank"
        | "name"
        | "price"
        | "change24h"
        | "change7d"
        | "marketCap"
        | "volume"
        | "supply";
    type SortDir = "asc" | "desc";
    let sortKey = $state<SortKey>("rank");
    let sortDir = $state<SortDir>("asc");

    function toggleSort(key: SortKey) {
        if (sortKey === key) {
            sortDir = sortDir === "desc" ? "asc" : "desc";
        } else {
            sortKey = key;
            sortDir = "desc";
        }
    }

    function sparkline7dChange(sparkline: number[]): number {
        if (!sparkline || sparkline.length < 2) return 0;
        const first = sparkline[0];
        if (first === 0) return 0;
        return (sparkline[sparkline.length - 1] - first) / first;
    }

    const sortedCoins = $derived.by(() => {
        const coins = [...viewData.coins];
        const dir = sortDir === "asc" ? 1 : -1;
        coins.sort((a, b) => {
            switch (sortKey) {
                case "name":
                    return dir * a.name.localeCompare(b.name);
                case "price":
                    return dir * (a.currentPrice - b.currentPrice);
                case "change24h":
                    return (
                        dir *
                        (a.priceChangePercentage24h -
                            b.priceChangePercentage24h)
                    );
                case "change7d":
                    return (
                        dir *
                        (sparkline7dChange(a.sparkline7d) -
                            sparkline7dChange(b.sparkline7d))
                    );
                case "marketCap":
                    return dir * (a.marketCap - b.marketCap);
                case "volume":
                    return dir * (a.totalVolume24h - b.totalVolume24h);
                case "supply":
                    return dir * (a.circulatingSupply - b.circulatingSupply);
                default:
                    return dir * (a.marketCapRank - b.marketCapRank);
            }
        });
        return coins;
    });

    const SORT_LABELS: Record<SortKey, string> = {
        rank: "Market Cap",
        name: "Name",
        price: "Price",
        change24h: "24h Change",
        change7d: "7d Change",
        marketCap: "Market Cap",
        volume: "24h Volume",
        supply: "Circulating Supply",
    };

    const sectionTitle = $derived(
        `Top 100 Cryptocurrencies By ${SORT_LABELS[sortKey]}`,
    );

    // Live price jitter — reactive entry list tracks viewData reactively.
    const jitter = createPriceJitter();
    const hover = createHoverGlow();
    const titleTransition = createTextTransition(450);

    $effect(() => { titleTransition.notify(sectionTitle); });

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
    <h2 class={`m3-surface-title${titleTransition.animating ? ' text-transition-in' : ''}`}>{sectionTitle}</h2>
    {#if viewData.error}
        <p class="error-text">Unable to load market data: {viewData.error}</p>
    {:else}
        <MarketFilterBar />

        <div class="market-table-wrap">
            <table class="market-table">
                <thead>
                    <tr>
                        {#snippet sortTh(
                            key:
                                | "rank"
                                | "name"
                                | "price"
                                | "change24h"
                                | "change7d"
                                | "marketCap"
                                | "volume"
                                | "supply",
                            label: string,
                        )}
                            <th class={sortKey === key ? "th--sorted" : ""}>
                                <button
                                    class="sort-btn"
                                    onclick={() => toggleSort(key)}
                                >
                                    {label}<span
                                        class="sort-icon"
                                        aria-hidden="true"
                                        >{sortKey === key
                                            ? sortDir === "asc"
                                                ? "▲"
                                                : "▼"
                                            : "⇅"}</span
                                    >
                                </button>
                            </th>
                        {/snippet}
                        {@render sortTh("rank", "Rank")}
                        {@render sortTh("name", "Coin")}
                        {@render sortTh("price", "Price")}
                        {@render sortTh("change24h", "24h")}
                        {@render sortTh("change7d", "7d")}
                        {@render sortTh("marketCap", "Market Cap")}
                        {@render sortTh("volume", "Volume (24h)")}
                        {@render sortTh("supply", "Circulating Supply")}
                    </tr>
                </thead>
                <tbody>
                    {#each sortedCoins.slice(0, renderedCount) as coin}
                        <CoinTableRow {coin} {jitter} />
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    <p class="market-footnote">Live source: {viewData.source}</p>
</section>
