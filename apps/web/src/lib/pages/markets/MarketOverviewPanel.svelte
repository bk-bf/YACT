<script lang="ts">
    import type { MarketsPageData } from "./markets-page.data";
    import { isCoinJitterEligible } from "../../effects/usePriceJitter.svelte";
    import {
        fullUsd,
        signedPercent,
        formatDetailedUsd,
        formatStableCompactUsd,
        formatTwoDecimals,
        formatWhole,
        displayCoinName,
    } from "../../utils/formatters";
    import {
        sparklinePath,
        chartDirectionClass,
        SPARKLINE_WIDTH,
        SPARKLINE_HEIGHT,
    } from "../../utils/sparkline";

    type OverviewStyleVariant = "separate" | "unified" | "minimal";

    const {
        viewData,
        jitter,
        hover,
        overviewStyle,
        showPill = true,
    }: {
        viewData: MarketsPageData;
        jitter: {
            getFlash: (k: string) => string | null;
            getValue: (k: string, b: number) => number;
        };
        hover: {
            isActive: (id: string) => boolean;
            enter: (id: string) => void;
            leave: () => void;
        };
        overviewStyle: OverviewStyleVariant;
        showPill?: boolean;
    } = $props();

    function formatJitterUsd(key: string, base: number): string {
        return formatDetailedUsd(jitter.getValue(key, base));
    }

    function marketCapDirectionClass(): "chart-positive" | "chart-negative" {
        return viewData.global.marketCapChangePercentage24hUsd >= 0
            ? "chart-positive"
            : "chart-negative";
    }

    const sparklineWidth = SPARKLINE_WIDTH;
    const sparklineHeight = SPARKLINE_HEIGHT;
</script>

<section class={`market-overview market-overview--${overviewStyle}`}>
    <div class="market-overview-head">
        <div>
            <h1>Cryptocurrency Prices by Market Cap</h1>
            <p class="market-overview-subtitle">
                The global crypto market cap today is
                <span
                    class={[
                        showPill ? "market-overview-pill" : "",
                        jitter.getFlash("globalMarketCap") === "up" ? "price-tick-up" : jitter.getFlash("globalMarketCap") === "down" ? "price-tick-down" : "",
                        hover.isActive("pill") ? "hover-glow-active" : "",
                    ].filter(Boolean).join(" ") || undefined}
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
                        class={viewData.global.marketCapChangePercentage24hUsd >= 0
                            ? "positive market-overview-pill-change"
                            : "negative market-overview-pill-change"}
                    >
                        {signedPercent.format(
                            viewData.global.marketCapChangePercentage24hUsd / 100,
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
                                    jitter.getFlash(coin.id) === "up"
                                        ? "price-tick-up"
                                        : jitter.getFlash(coin.id) === "down"
                                          ? "price-tick-down"
                                          : "",
                                    hover.isActive(`t-price-${coin.id}`)
                                        ? "hover-glow-active"
                                        : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                onmouseenter={() =>
                                    hover.enter(`t-price-${coin.id}`)}
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
                                    coin.priceChangePercentage24h >= 0
                                        ? "positive"
                                        : "negative",
                                    "overview-coin-change",
                                    hover.isActive(`t-chg-${coin.id}`)
                                        ? coin.priceChangePercentage24h >= 0
                                            ? "hover-glow-positive"
                                            : "hover-glow-negative"
                                        : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                onmouseenter={() =>
                                    hover.enter(`t-chg-${coin.id}`)}
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
                <h3>🚀 Top Gainers</h3>
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
                                coin.priceChangePercentage24h >= 0
                                    ? "positive"
                                    : "negative",
                                hover.isActive(`g-chg-${coin.id}`)
                                    ? coin.priceChangePercentage24h >= 0
                                        ? "hover-glow-positive"
                                        : "hover-glow-negative"
                                    : "",
                            ]
                                .join(" ")
                                .trim()}
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
