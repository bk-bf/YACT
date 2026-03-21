<script lang="ts">
    import { browser } from "$app/environment";
    import { navigating } from "$app/stores";
    import { getContext } from "svelte";
    import {
        VIEW_SETTINGS_KEY,
        type ViewSettings,
    } from "../../composables/useViewSettings.svelte";
    import CoinTerminalChart from "../../components/CoinTerminalChart.svelte";
    import {
        loadCoinDetailPageData,
        loadCoinDetailMarketsAuxData,
    } from "./coin-detail-page.data";
    import { useProgressiveDataLoad } from "../../composables/useProgressiveDataLoad.svelte";
    import CoinHeroCard from "./CoinHeroCard.svelte";
    import CoinConverterCard from "./CoinConverterCard.svelte";
    import CoinPricePerformanceCard from "./CoinPricePerformanceCard.svelte";
    import CoinMarketMetricsCard from "./CoinMarketMetricsCard.svelte";
    import CoinSupplyCard from "./CoinSupplyCard.svelte";
    import CoinInfoCard from "./CoinInfoCard.svelte";
    import CoinAboutCard from "./CoinAboutCard.svelte";
    import CoinMomentumCard from "./CoinMomentumCard.svelte";
    import CoinNewsCard from "./CoinNewsCard.svelte";
    import CoinMoversCard from "./CoinMoversCard.svelte";

    let { data } = $props();
    const settings = getContext<ViewSettings>(VIEW_SETTINGS_KEY);
    const progressive = useProgressiveDataLoad(() => data);
    const viewData = $derived(progressive.getViewData());

    let isRefreshingCoinData = $state(false);
    let lastInitialRefreshCoinId = $state<string | null>(null);
    let isCoinDetailViewActive = $state(true);
    let refreshAbortController = $state<AbortController | null>(null);

    const refreshCoinData = async () => {
        if (isRefreshingCoinData) {
            return;
        }

        refreshAbortController?.abort();
        const abortController = new AbortController();
        refreshAbortController = abortController;

        isRefreshingCoinData = true;

        // Markets aux is independent of coin/chart/headlines — start it immediately.
        const marketsPromise = loadCoinDetailMarketsAuxData(
            fetch,
            abortController.signal,
        );

        // Unified pipeline: coin + chart + headlines all in parallel (same as route load).
        try {
            await progressive.loadCritical(() =>
                loadCoinDetailPageData(fetch, coin.id, abortController.signal),
            );

            if (!isCoinDetailViewActive) {
                return;
            }

            // Markets side panels are non-blocking and independent.
            void progressive.loadAuxiliary(async (current) => {
                const aux = await marketsPromise;
                return {
                    ...current,
                    trending:
                        aux.trending.length > 0
                            ? aux.trending
                            : current.trending,
                    topGainers:
                        aux.topGainers.length > 0
                            ? aux.topGainers
                            : current.topGainers,
                    marketsSnapshotTs:
                        aux.marketsSnapshotTs ?? current.marketsSnapshotTs,
                };
            });
        } finally {
            isRefreshingCoinData = false;
            if (refreshAbortController === abortController) {
                refreshAbortController = null;
            }
        }
    };

    $effect(() => {
        isCoinDetailViewActive = true;
        return () => {
            isCoinDetailViewActive = false;
            refreshAbortController?.abort();
        };
    });

    $effect(() => {
        const destinationPath = $navigating?.to?.url?.pathname;
        if (!destinationPath) {
            return;
        }

        if (!destinationPath.startsWith("/currencies/")) {
            isCoinDetailViewActive = false;
            refreshAbortController?.abort();
        }
    });

    const coin = $derived(viewData.coin);

    $effect(() => {
        if (!browser) {
            return;
        }

        if (lastInitialRefreshCoinId === data.coin.id) {
            return;
        }

        lastInitialRefreshCoinId = data.coin.id;
        void refreshCoinData().then(() => {
            lastCoinDetailRefreshAt = Date.now();
        });
    });

    $effect(() => {
        if (!browser) {
            return;
        }

        let cancelled = false;
        let lastCoinSnapshotTs = viewData.coinSnapshotTs ?? null;
        let lastMarketSnapshotTs = viewData.marketsSnapshotTs ?? null;
        const currentCoinId = coin.id;

        const pollSnapshotMeta = async () => {
            try {
                const response = await fetch(
                    `/api/debug/snapshot-meta?coinId=${encodeURIComponent(currentCoinId)}&_ts=${Date.now()}`,
                    { cache: "no-store" },
                );
                if (!response.ok) {
                    return;
                }

                const payload = (await response.json()) as {
                    coinSnapshotTs?: number | null;
                    marketSnapshotTs?: number | null;
                };

                if (cancelled) {
                    return;
                }

                if (lastCoinSnapshotTs === null && payload.coinSnapshotTs) {
                    lastCoinSnapshotTs = payload.coinSnapshotTs;
                }
                if (lastMarketSnapshotTs === null && payload.marketSnapshotTs) {
                    lastMarketSnapshotTs = payload.marketSnapshotTs;
                }

                const coinUpdated =
                    payload.coinSnapshotTs &&
                    payload.coinSnapshotTs !== lastCoinSnapshotTs;
                const marketUpdated =
                    payload.marketSnapshotTs &&
                    payload.marketSnapshotTs !== lastMarketSnapshotTs;

                if (coinUpdated || marketUpdated) {
                    const previousCoinTs = lastCoinSnapshotTs;
                    const previousMarketTs = lastMarketSnapshotTs;
                    if (payload.coinSnapshotTs) {
                        lastCoinSnapshotTs = payload.coinSnapshotTs;
                    }
                    if (payload.marketSnapshotTs) {
                        lastMarketSnapshotTs = payload.marketSnapshotTs;
                    }

                    console.info("[auto-ui-refresh]", {
                        page: "coin",
                        coinId: currentCoinId,
                        previousCoinTs,
                        nextCoinTs: payload.coinSnapshotTs ?? null,
                        previousMarketTs,
                        nextMarketTs: payload.marketSnapshotTs ?? null,
                        reason: coinUpdated
                            ? "coin-db-updated"
                            : "market-db-updated",
                    });
                    await refreshCoinData();
                }
            } catch (error) {
                if (!cancelled) {
                    const errorMessage =
                        error instanceof Error ? error.message : String(error);
                    if (
                        errorMessage.includes("NetworkError") ||
                        errorMessage.includes("Failed to fetch")
                    ) {
                        return;
                    }

                    console.warn("[auto-ui-refresh]", {
                        page: "coin",
                        coinId: currentCoinId,
                        phase: "poll-error",
                        error: errorMessage,
                    });
                }
            }
        };

        void pollSnapshotMeta();
        const timer = window.setInterval(() => {
            void pollSnapshotMeta();
        }, 15_000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    });

    // Tier 2 refresh: when the user returns to a stale tab (>3 min since last
    // full data load), silently re-run the unified pipeline (coin + chart +
    // headlines in parallel). Tier 3 fields (description, contracts, ATH, etc.)
    // are included in the same fetch and update quietly — no separate request
    // needed since coin breakdown is a single endpoint.
    const COIN_DETAIL_TIER2_TTL_MS = 3 * 60 * 1000; // 3 minutes
    let lastCoinDetailRefreshAt = $state(Date.now());

    $effect(() => {
        if (!browser) return;

        let cancelled = false;

        const onVisibilityChange = () => {
            if (document.visibilityState !== "visible") return;
            if (Date.now() - lastCoinDetailRefreshAt < COIN_DETAIL_TIER2_TTL_MS)
                return;
            if (cancelled || isRefreshingCoinData) return;

            console.info(
                "[tier-2-refresh] coin-detail: stale tab returned, refreshing",
                { coinId: coin.id },
            );
            void refreshCoinData().then(() => {
                if (!cancelled) {
                    lastCoinDetailRefreshAt = Date.now();
                    console.info("[tier-2-refresh] coin-detail: updated", {
                        coinId: coin.id,
                    });
                }
            });
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            cancelled = true;
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    });
</script>

<svelte:head>
    <title>{coin.name} Markets | YACT</title>
</svelte:head>

<section class="coin-terminal coin-terminal--{settings.overviewStyle}">
    <div class="coin-terminal-layout">
        <aside class="coin-left-rail">
            <CoinHeroCard {coin} />
            <CoinConverterCard {coin} />
            <CoinPricePerformanceCard {coin} />
            <CoinMarketMetricsCard {coin} />
            <CoinSupplyCard {coin} />
            <CoinInfoCard {coin} />
        </aside>

        <main class="coin-main-panel">
            <div
                class="coin-terminal-tabs coin-terminal-tabs-center"
                role="tablist"
                aria-label="Coin sections"
            >
                <button class="coin-terminal-tab active" type="button">Chart</button>
                <button class="coin-terminal-tab" type="button">Markets</button>
                <button class="coin-terminal-tab" type="button">News</button>
                <button class="coin-terminal-tab" type="button">Yield</button>
                <button class="coin-terminal-tab" type="button">About</button>
            </div>

            <CoinTerminalChart {coin} />
            <CoinAboutCard {coin} />
        </main>

        <aside class="coin-right-rail">
            <CoinMomentumCard {coin} />
            <CoinNewsCard headlines={viewData.headlines ?? []} />
            <CoinMoversCard topGainers={viewData.topGainers} />
        </aside>
    </div>
</section>
