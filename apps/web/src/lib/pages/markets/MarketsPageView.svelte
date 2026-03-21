<script lang="ts">
    import M3Button from "../../components/M3Button.svelte";
    import { createEmptyMarketsPageData } from "./markets-page.data";

    // Ownership contract (BUG-002):
    // - This view renders route-owned payload only.
    // - Structural fallback is allowed for safety, but this component must not
    //   perform its own markets polling/refresh writes.
    // - Shared layout polling can update shell surfaces, not page-owned state.
    const fallbackData = createEmptyMarketsPageData();
    let { data } = $props();

    // Safeguard: ensure data has required structure, falling back if any field is missing
    const viewData = $derived(
        data &&
            data.coins &&
            data.global &&
            data.highlights &&
            data.highlights.trending !== undefined &&
            data.highlights.topGainers !== undefined
            ? data
            : fallbackData,
    );

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

    const compactUsd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
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
</script>

<svelte:head>
    <title>YACT Top 100 Markets</title>
</svelte:head>

<section class="market-overview">
    <div class="market-overview-head">
        <div>
            <h1>Cryptocurrency Prices by Market Cap</h1>
            <p class="market-overview-subtitle">
                The global crypto market cap today is
                <span class="market-overview-pill">
                    <strong class="market-overview-pill-value"
                        >{formatDetailedUsd(
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
            <h3>{formatDetailedUsd(viewData.global.totalMarketCapUsd)}</h3>
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
                Reference compact value: {compactUsd.format(
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
            <h3>{formatDetailedUsd(viewData.global.totalVolumeUsd)}</h3>
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
                <h3>Trending</h3>
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Wire this placeholder button to a full Trending list view. -->
                <button type="button" class="inline-link">View more</button>
            </header>
            <ul>
                {#each viewData.highlights.trending as coin}
                    <li>
                        <div class="overview-coin-info">
                            <span>{displayCoinName(coin.name)}</span>
                            <span class="overview-coin-meta"
                                >{coin.symbol.toUpperCase()} · Rank #{coin.marketCapRank}</span
                            >
                        </div>
                        <span class="overview-coin-value"
                            >{fullUsd.format(coin.currentPrice)}</span
                        >
                    </li>
                {/each}
            </ul>
        </article>

        <article class="overview-list-card">
            <header>
                <h3>Top Gainers</h3>
                <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Wire this placeholder button to a full Top Gainers list view. -->
                <button type="button" class="inline-link">View more</button>
            </header>
            <ul>
                {#each viewData.highlights.topGainers as coin}
                    <li>
                        <div class="overview-coin-info">
                            <span>{displayCoinName(coin.name)}</span>
                            <span class="overview-coin-meta"
                                >{coin.symbol.toUpperCase()} · {fullUsd.format(
                                    coin.currentPrice,
                                )}</span
                            >
                        </div>
                        <span
                            class={`overview-coin-value ${coin.priceChangePercentage24h >= 0 ? "positive" : "negative"}`}
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
                            <td>{usd.format(coin.currentPrice)}</td>
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
                            <td>{compactUsd.format(coin.marketCap)}</td>
                            <td>{compactUsd.format(coin.totalVolume24h)}</td>
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

    <div class="m3-button-row" style="margin-top: 1rem;">
        <!-- TODO(T-004, see .docs/features/open/ROADMAP.md): Replace watchlist workspace shortcut placeholder with real watchlist workflow entry point. -->
        <M3Button href="/watchlist" tone="tonal"
            >Open Watchlist Workspace</M3Button
        >
        <!-- TODO(T-010, see .docs/features/open/ROADMAP.md): Replace refresh placeholder link with true refresh control/state action. -->
        <M3Button href="/" tone="outlined">Refresh Top 100</M3Button>
    </div>

    <p class="market-footnote">Live source: {viewData.source}</p>
</section>
