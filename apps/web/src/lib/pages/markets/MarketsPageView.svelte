<script lang="ts">
    import { browser } from "$app/environment";
    import {
        createPriceJitter,
        isCoinJitterEligible,
    } from "../../effects/usePriceJitter.svelte";
    import { createHoverGlow } from "../../effects/useHoverGlow.svelte";
    import M3Button from "../../components/M3Button.svelte";
    import {
        coerceMarketsPageData,
        createEmptyMarketsPageData,
        hasMeaningfulMarketsPayload,
        isMarketsDataCacheStale,
        loadMarketsPageData,
        setMarketsDataCache,
    } from "./markets-page.data";

    // Ownership contract (BUG-002):
    // - This view renders route-owned payload only.
    // - Structural fallback is allowed for safety, but this component must not
    //   perform its own markets polling/refresh writes.
    // - Exception: bounded recovery retries are allowed only when route payload
    //   is empty, to avoid persistent zero-state lockups after slow navigation.
    // - Shared layout polling can update shell surfaces, not page-owned state.
    const fallbackData = createEmptyMarketsPageData();
    let { data } = $props();
    let recoveredData = $state<typeof fallbackData | null>(null);

    // Safeguard: ensure data has required structure, falling back if any field is missing
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

    $effect(() => {
        if (!browser) return;
        if (recoveredData !== null) return;

        const current = data ?? fallbackData;
        if (hasMeaningfulMarketsPayload(current)) return;

        let cancelled = false;

        // Recovery retries: if route payload arrived empty, fetch a fresh payload
        // up to 3 times in case the first request was cancelled in navigation.
        void (async () => {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const next = await loadMarketsPageData(fetch, 5000);
                if (cancelled) {
                    return;
                }

                if (hasMeaningfulMarketsPayload(next)) {
                    setMarketsDataCache(next);
                    recoveredData = next;
                    // Fix BUG-002: notify the shell immediately so it can update
                    // sharedGlobal without waiting for its 30s polling cycle.
                    window.dispatchEvent(
                        new CustomEvent("yact:global-ready", {
                            detail: next.global,
                        }),
                    );
                    return;
                }

                if (attempt < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 350));
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    });

    $effect(() => {
        if (!browser) {
            return;
        }

        const onMarketsSync = (event: Event) => {
            const customEvent = event as CustomEvent;
            const next = coerceMarketsPageData(
                (customEvent.detail as Record<string, unknown>) ?? null,
            );

            if (hasMeaningfulMarketsPayload(next)) {
                setMarketsDataCache(next);
                recoveredData = next;
            }
        };

        window.addEventListener("yact:markets-sync", onMarketsSync);
        return () => {
            window.removeEventListener("yact:markets-sync", onMarketsSync);
        };
    });

    // Tier 2 refresh: when the user returns to a stale tab (>3 min since last
    // fetch), silently refresh the coin table, summary cards, and headlines.
    // Does not show a loading state — updates quietly in the background.
    $effect(() => {
        if (!browser) return;

        let cancelled = false;

        const onVisibilityChange = () => {
            if (document.visibilityState !== "visible") return;
            if (!isMarketsDataCacheStale()) return;
            if (cancelled) return;

            console.info(
                "[tier-2-refresh] markets: stale tab returned, fetching fresh data",
            );
            void loadMarketsPageData(fetch, 5000).then((next) => {
                if (cancelled) return;
                if (!hasMeaningfulMarketsPayload(next)) return;
                setMarketsDataCache(next);
                recoveredData = next;
                console.info("[tier-2-refresh] markets: updated", {
                    coins: next.coins.length,
                    source: next.source,
                });
                window.dispatchEvent(
                    new CustomEvent("yact:global-ready", {
                        detail: next.global,
                    }),
                );
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

    const usd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    });

    const percent = new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
        signDisplay: "always",
    });

    const fullUsd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    });

    const largeUsd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });

    const compactNumber = new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2,
    });

    const fullInteger = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    });

    const signedPercent = new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
        signDisplay: "always",
    });

    const sparklineWidth = 140;
    const sparklineHeight = 42;

    function sparklinePath(
        points: number[] | null | undefined,
        width = sparklineWidth,
        height = sparklineHeight,
    ): string {
        const safePoints = Array.isArray(points)
            ? points.filter((value) => Number.isFinite(value))
            : [];

        if (!safePoints.length) return "";
        if (safePoints.length === 1)
            return `M 0 ${height / 2} L ${width} ${height / 2}`;

        const min = Math.min(...safePoints);
        const max = Math.max(...safePoints);
        const range = max - min || 1;
        const stepX = width / (safePoints.length - 1);

        return safePoints
            .map((value, index) => {
                const x = index * stepX;
                const y = height - ((value - min) / range) * height;
                return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(" ");
    }

    function chartDirectionClass(
        points: number[] | null | undefined,
    ): "chart-positive" | "chart-negative" {
        const safePoints = Array.isArray(points)
            ? points.filter((value) => Number.isFinite(value))
            : [];

        if (safePoints.length < 2) return "chart-negative";
        return safePoints[safePoints.length - 1] >= safePoints[0]
            ? "chart-positive"
            : "chart-negative";
    }

    function marketCapDirectionClass(): "chart-positive" | "chart-negative" {
        return viewData.global.marketCapChangePercentage24hUsd >= 0
            ? "chart-positive"
            : "chart-negative";
    }

    function displayCoinName(value: string): string {
        return value
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function formatDetailedUsd(value: number): string {
        return value >= 1000 ? largeUsd.format(value) : fullUsd.format(value);
    }

    function formatStableCompactUsd(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "--";
        }

        const abs = Math.abs(value);
        if (abs >= 1_000_000_000_000) {
            return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
        }
        if (abs >= 1_000_000_000) {
            return `$${(value / 1_000_000_000).toFixed(2)}B`;
        }
        if (abs >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(2)}M`;
        }
        if (abs >= 1_000) {
            return `$${(value / 1_000).toFixed(2)}K`;
        }
        return `$${value.toFixed(2)}`;
    }

    function formatTwoDecimals(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "--";
        }
        return value.toFixed(2);
    }

    function formatWhole(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "--";
        }
        return fullInteger.format(value);
    }

    // ── Live price jitter — managed by usePriceJitter composable ──────────
    const jitter = createPriceJitter();
    const hover  = createHoverGlow();

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

    function formatJitterUsd(key: string, base: number): string {
        return formatDetailedUsd(jitter.getValue(key, base));
    }
</script>

<svelte:head>
    <title>YACT Top 100 Markets</title>
</svelte:head>

{#if false}<!-- market-overview section temporarily hidden -->
<section class="market-overview">
    <div class="market-overview-head">
        <div>
            <h1>Cryptocurrency Prices by Market Cap</h1>
            <p class="market-overview-subtitle">
                The global crypto market cap today is
                <span
                    class={`market-overview-pill ${jitter.getFlash("globalMarketCap") === "up" ? "price-tick-up" : jitter.getFlash("globalMarketCap") === "down" ? "price-tick-down" : ""} ${hover.isActive("pill") ? "hover-glow-active" : ""}`}
                    onmouseenter={() => hover.enter("pill")}
                    onmouseleave={() => hover.leave()}
                >
                    <strong class="market-overview-pill-value"
                        >{formatJitterUsd(
                            "globalMarketCap",
                            viewData.global.totalMarketCapUsd,
                        )}</strong
                    >
                    <span
                        class={viewData.global
                            .marketCapChangePercentage24hUsd >= 0
                            ? "positive market-overview-pill-change"
                            : "negative market-overview-pill-change"}
                    >
                        {signedPercent.format(
                            viewData.global.marketCapChangePercentage24hUsd /
                                100,
                        )}
                    </span>
                </span>
                for the last 24 hours.
            </p>
        </div>
    </div>

    <div class="overview-grid">
        <article class="overview-stat-card">
            <h3
                class={jitter.getFlash("globalMarketCap") === "up"
                    ? "price-tick-up"
                    : jitter.getFlash("globalMarketCap") === "down"
                      ? "price-tick-down"
                      : ""}
            >
                {formatJitterUsd(
                    "globalMarketCap",
                    viewData.global.totalMarketCapUsd,
                )}
            </h3>
            <p>
                Market Cap
                <span
                    class={viewData.global.marketCapChangePercentage24hUsd >= 0
                        ? "positive"
                        : "negative"}
                >
                    {signedPercent.format(
                        viewData.global.marketCapChangePercentage24hUsd / 100,
                    )}
                </span>
            </p>
            <p class="muted">
                Reference compact value: {formatStableCompactUsd(
                    viewData.global.totalMarketCapUsd,
                )}
            </p>
            <svg
                class={`sparkline sparkline-market ${marketCapDirectionClass()}`}
                viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="7 day market cap chart"
            >
                <path d={sparklinePath(viewData.global.marketCapSparkline7d)} />
            </svg>
        </article>

        <article class="overview-stat-card">
            <h3
                class={jitter.getFlash("globalVolume") === "up"
                    ? "price-tick-up"
                    : jitter.getFlash("globalVolume") === "down"
                      ? "price-tick-down"
                      : ""}
            >
                {formatJitterUsd(
                    "globalVolume",
                    viewData.global.totalVolumeUsd,
                )}
            </h3>
            <p>24h Trading Volume</p>
            <p class="muted">
                BTC Dominance: {formatTwoDecimals(
                    viewData.global.btcDominance,
                )}%
            </p>
            <p class="muted">
                Active Cryptocurrencies: {formatWhole(
                    viewData.global.activeCryptocurrencies,
                )}
            </p>
        </article>

        <article class="overview-list-card">
            <header>
                <h3>🔥 Trending</h3>
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Wire this placeholder button to a full Trending list view. -->
                <button type="button" class="inline-link">View more ›</button>
            </header>
            <ul>
                {#each viewData.highlights.trending as coin}
                    <li>
                        <div class="overview-coin-row">
                            <img
                                class="overview-coin-logo"
                                src={coin.image}
                                alt={coin.name}
                                width="24"
                                height="24"
                            />
                            <div class="overview-coin-info">
                                <span>{displayCoinName(coin.name)}</span>
                                <span class="overview-coin-meta"
                                    >{coin.symbol.toUpperCase()} · Rank #{coin.marketCapRank}</span
                                >
                            </div>
                        </div>
                        <div class="overview-coin-right">
                            <span
                                class={[
                                    "overview-coin-value",
                                    jitter.getFlash(coin.id) === "up" ? "price-tick-up" : jitter.getFlash(coin.id) === "down" ? "price-tick-down" : "",
                                    hover.isActive(`t-price-${coin.id}`) ? "hover-glow-active" : "",
                                ].filter(Boolean).join(" ")}
                                onmouseenter={() => hover.enter(`t-price-${coin.id}`)}
                                onmouseleave={() => hover.leave()}
                            >
                                {isCoinJitterEligible(coin)
                                    ? formatJitterUsd(
                                          coin.id,
                                          coin.currentPrice,
                                      )
                                    : fullUsd.format(coin.currentPrice)}
                            </span>
                            <span
                                class={[
                                    coin.priceChangePercentage24h >= 0 ? "positive" : "negative",
                                    "overview-coin-change",
                                    hover.isActive(`t-chg-${coin.id}`) ? (coin.priceChangePercentage24h >= 0 ? "hover-glow-positive" : "hover-glow-negative") : "",
                                ].filter(Boolean).join(" ")}
                                onmouseenter={() => hover.enter(`t-chg-${coin.id}`)}
                                onmouseleave={() => hover.leave()}
                            >
                                {signedPercent.format(
                                    coin.priceChangePercentage24h / 100,
                                )}
                            </span>
                        </div>
                    </li>
                {/each}
            </ul>
        </article>

        <article class="overview-list-card">
            <header>
                <h3>� Top Gainers</h3>
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Wire this placeholder button to a full Top Gainers list view. -->
                <button type="button" class="inline-link">View more ›</button>
            </header>
            <ul>
                {#each viewData.highlights.topGainers as coin}
                    <li>
                        <div class="overview-coin-row">
                            <img
                                class="overview-coin-logo"
                                src={coin.image}
                                alt={coin.name}
                                width="24"
                                height="24"
                            />
                            <div class="overview-coin-info">
                                <span>{displayCoinName(coin.name)}</span>
                                <span class="overview-coin-meta"
                                    >{coin.symbol.toUpperCase()} · {fullUsd.format(
                                        coin.currentPrice,
                                    )}</span
                                >
                            </div>
                        </div>
                        <span
                            class={[
                                "overview-coin-value",
                                coin.priceChangePercentage24h >= 0 ? "positive" : "negative",
                                hover.isActive(`g-chg-${coin.id}`) ? (coin.priceChangePercentage24h >= 0 ? "hover-glow-positive" : "hover-glow-negative") : "",
                            ].join(" ").trim()}
                            onmouseenter={() => hover.enter(`g-chg-${coin.id}`)}
                            onmouseleave={() => hover.leave()}
                        >
                            {signedPercent.format(
                                coin.priceChangePercentage24h / 100,
                            )}
                        </span>
                    </li>
                {/each}
            </ul>
        </article>
    </div>
</section>
{/if}

<section class="market-section">
    <h2 class="m3-surface-title">Top 100 Cryptocurrencies By Market Cap</h2>
    {#if viewData.error}
        <p class="error-text">Unable to load market data: {viewData.error}</p>
    {:else}
        <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Connect placeholder market filter buttons to real filtering state/query logic. -->
        <div
            class="table-filter-bar"
            role="toolbar"
            aria-label="Market filters"
        >
            <div class="table-filter-left">
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Top 100 filter behavior. -->
                <button class="table-filter-item active" type="button"
                    >Top 100</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Trending filter behavior. -->
                <button class="table-filter-item" type="button">Trending</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement New Listings filter behavior. -->
                <button class="table-filter-item" type="button"
                    >New Listings</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Layer 1 filter behavior. -->
                <button class="table-filter-item" type="button">Layer 1</button>
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement DeFi filter behavior. -->
                <button class="table-filter-item" type="button">DeFi</button>
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement AI Tokens filter behavior. -->
                <button class="table-filter-item" type="button"
                    >AI Tokens</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement All market category filter behavior. -->
                <button class="table-filter-item" type="button">All</button>
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Highlights category filter behavior. -->
                <button class="table-filter-item" type="button"
                    >Highlights</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Base Ecosystem category filter behavior. -->
                <button class="table-filter-item" type="button"
                    >Base Ecosystem</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Categories filter behavior. -->
                <button class="table-filter-item" type="button"
                    >Categories</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Payment Solutions filter behavior. -->
                <button class="table-filter-item" type="button"
                    >Payment Solutions</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement Perpetuals filter behavior. -->
                <button class="table-filter-item" type="button"
                    >Perpetuals</button
                >
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Implement DEX filter behavior. -->
                <button class="table-filter-item" type="button">DEX</button>
            </div>
        </div>

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
                        <tr>
                            <td>{coin.marketCapRank}</td>
                            <td>
                                <div class="coin-name">
                                    <a
                                        class="coin-row-anchor"
                                        href={`/currencies/${encodeURIComponent(coin.id)}`}
                                        aria-label={`Open ${coin.name} breakdown`}
                                    >
                                        <img
                                            src={coin.image}
                                            alt={coin.name}
                                            width="24"
                                            height="24"
                                        />
                                        <span
                                            >{coin.name} ({coin.symbol.toUpperCase()})</span
                                        >
                                    </a>
                                </div>
                            </td>
                            <td
                                class={jitter.getFlash(coin.id) === "up"
                                    ? "price-tick-up"
                                    : jitter.getFlash(coin.id) === "down"
                                      ? "price-tick-down"
                                      : ""}
                            >
                                {isCoinJitterEligible(coin)
                                    ? formatJitterUsd(
                                          coin.id,
                                          coin.currentPrice,
                                      )
                                    : usd.format(coin.currentPrice)}
                            </td>
                            <td
                                class={coin.priceChangePercentage24h >= 0
                                    ? "positive"
                                    : "negative"}
                            >
                                {percent.format(
                                    coin.priceChangePercentage24h / 100,
                                )}
                            </td>
                            <td>
                                <svg
                                    class={`sparkline sparkline-coin ${chartDirectionClass(coin.sparkline7d)}`}
                                    viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
                                    preserveAspectRatio="none"
                                    role="img"
                                    aria-label={`${coin.name} 7 day chart`}
                                >
                                    <path d={sparklinePath(coin.sparkline7d)} />
                                </svg>
                            </td>
                            <td>{formatStableCompactUsd(coin.marketCap)}</td>
                            <td
                                >{formatStableCompactUsd(
                                    coin.totalVolume24h,
                                )}</td
                            >
                            <td>
                                {compactNumber.format(coin.circulatingSupply)}
                                {coin.symbol.toUpperCase()}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    <p class="market-footnote">Live source: {viewData.source}</p>
</section>
