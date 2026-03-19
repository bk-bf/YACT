<script lang="ts">
    import CoinTerminalChart from '../../../lib/components/CoinTerminalChart.svelte';

    let { data } = $props();

    const usd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    });

    const compactUsd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
    });

    const percent = new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
        signDisplay: "always",
    });

    const integerNumber = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
    });

    const dateTime = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    const headlineTime = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });


    function formatOptionalDate(value: string | null): string {
        if (!value) return "--";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return dateTime.format(date);
    }

    function formatHeadlineDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return headlineTime.format(date);
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }


    const coin = $derived(data.coin);
    const primaryHeadline = $derived(data.headlines[0] ?? null);
    const extraHeadlines = $derived((data.headlines ?? []).slice(1, 4));
    const bullishShare = $derived(
        clamp(Math.round(50 + coin.priceChangePercentage24h * 4), 5, 95),
    );
    const bearishShare = $derived(100 - bullishShare);
    const volToMcapPercent = $derived(
        coin.marketCap > 0 ? (coin.totalVolume24h / coin.marketCap) * 100 : 0,
    );
    const fdv = $derived(
        coin.maxSupply ? coin.maxSupply * coin.currentPrice : null,
    );

</script>

<svelte:head>
    <title>{coin.name} Markets | YACT</title>
</svelte:head>

<section class="coin-terminal">
    {#if data.stale}
        <p class="warning-text">
            Showing cached coin snapshot while live detail data is unavailable.
        </p>
    {/if}

    <div class="coin-terminal-layout">
        <aside class="coin-left-rail">
            <article class="coin-rail-card coin-hero-card">
                <div class="coin-terminal-identity">
                    <img
                        src={coin.image}
                        alt={coin.name}
                        width="40"
                        height="40"
                    />
                    <h1>
                        {coin.name} <span>{coin.symbol.toUpperCase()}</span>
                    </h1>
                    <span class="metric-chip">#{coin.marketCapRank}</span>
                </div>

                <div class="coin-terminal-price">
                    <strong>{usd.format(coin.currentPrice)}</strong>
                    <span
                        class={coin.priceChangePercentage24h >= 0
                            ? "positive"
                            : "negative"}
                    >
                        {percent.format(coin.priceChangePercentage24h / 100)}
                    </span>
                </div>
            </article>

            <article class="coin-rail-card">
                <h3>Snapshot</h3>
                <ul class="coin-rail-list">
                    <li>
                        <span>Market cap</span><strong
                            >{compactUsd.format(coin.marketCap)}</strong
                        >
                    </li>
                    <li>
                        <span>Volume (24h)</span><strong
                            >{compactUsd.format(coin.totalVolume24h)}</strong
                        >
                    </li>
                    <li>
                        <span>Vol/Mcap ratio</span><strong
                            >{volToMcapPercent.toFixed(2)}%</strong
                        >
                    </li>
                    <li>
                        <span>FDV</span><strong
                            >{fdv ? compactUsd.format(fdv) : "--"}</strong
                        >
                    </li>
                </ul>
            </article>

            <article class="coin-rail-card">
                <h3>Supply</h3>
                <ul class="coin-rail-list">
                    <li>
                        <span>Circulating</span>
                        <strong
                            >{integerNumber.format(coin.circulatingSupply)}
                            {coin.symbol.toUpperCase()}</strong
                        >
                    </li>
                    <li>
                        <span>Max supply</span>
                        <strong
                            >{coin.maxSupply
                                ? `${integerNumber.format(coin.maxSupply)} ${coin.symbol.toUpperCase()}`
                                : "--"}</strong
                        >
                    </li>
                    <li>
                        <span>All-time high</span><strong
                            >{coin.allTimeHigh > 0
                                ? usd.format(coin.allTimeHigh)
                                : "--"}</strong
                        >
                    </li>
                    <li>
                        <span>ATH date</span><strong
                            >{formatOptionalDate(coin.allTimeHighDate)}</strong
                        >
                    </li>
                </ul>
            </article>

            <article class="coin-rail-card">
                <h3>Links</h3>
                <div class="coin-links">
                    {#if coin.homepage}
                        <a
                            class="m3-button outlined"
                            href={coin.homepage}
                            target="_blank"
                            rel="noreferrer">Website</a
                        >
                    {/if}
                    {#if coin.blockchainSite}
                        <a
                            class="m3-button outlined"
                            href={coin.blockchainSite}
                            target="_blank"
                            rel="noreferrer">Explorer</a
                        >
                    {/if}
                    <a
                        class="m3-button outlined"
                        href={coin.coingeckoUrl}
                        target="_blank"
                        rel="noreferrer">CoinGecko</a
                    >
                    <a
                        class="m3-button outlined"
                        href={coin.coinmarketcapUrl}
                        target="_blank"
                        rel="noreferrer">CoinMarketCap</a
                    >
                </div>
            </article>
        </aside>

        <main class="coin-main-panel">
            <div
                class="coin-terminal-tabs coin-terminal-tabs-center"
                role="tablist"
                aria-label="Coin sections"
            >
                <button class="coin-terminal-tab active" type="button"
                    >Chart</button
                >
                <button class="coin-terminal-tab" type="button">Markets</button>
                <button class="coin-terminal-tab" type="button">News</button>
                <button class="coin-terminal-tab" type="button">Yield</button>
                <button class="coin-terminal-tab" type="button">About</button>
            </div>

            <CoinTerminalChart {coin} />

            <article class="coin-about-card">
                <h3>{coin.name} Market Context</h3>
                {#if coin.description}
                    <p>{coin.description}</p>
                {:else}
                    <p class="muted">
                        No description available from the current data source.
                    </p>
                {/if}

                {#if coin.categories.length > 0}
                    <div>
                        {#each coin.categories.slice(0, 8) as category}
                            <span class="metric-chip">{category}</span>
                        {/each}
                    </div>
                {/if}
            </article>
        </main>

        <aside class="coin-right-rail">
            <article class="coin-rail-card">
                <h3>Community Sentiment</h3>
                <div
                    class="sentiment-bar"
                    aria-label="Bullish vs bearish sentiment"
                >
                    <span
                        class="sentiment-positive"
                        style={`width: ${bullishShare}%`}>{bullishShare}%</span
                    >
                    <span
                        class="sentiment-negative"
                        style={`width: ${bearishShare}%`}>{bearishShare}%</span
                    >
                </div>
            </article>

            <article class="coin-rail-card">
                <h3>Hot Topic</h3>
                {#if primaryHeadline}
                    <a
                        href={primaryHeadline.url}
                        target="_blank"
                        rel="noreferrer"
                        class="coin-news-link"
                    >
                        {primaryHeadline.title}
                    </a>
                    <p class="coin-news-meta">
                        {primaryHeadline.source} • {formatHeadlineDate(
                            primaryHeadline.publishedAt,
                        )}
                    </p>
                {:else}
                    <p class="muted">No headlines available right now.</p>
                {/if}
            </article>

            <article class="coin-rail-card">
                <h3>Latest</h3>
                {#if extraHeadlines.length > 0}
                    <ul class="coin-news-list">
                        {#each extraHeadlines as headline}
                            <li>
                                <a
                                    href={headline.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    class="coin-news-link"
                                >
                                    {headline.title}
                                </a>
                                <p class="coin-news-meta">
                                    {headline.source} • {formatHeadlineDate(
                                        headline.publishedAt,
                                    )}
                                </p>
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="muted">No additional headlines available.</p>
                {/if}
            </article>

            <article class="coin-rail-card">
                <h3>Market Movers</h3>
                <ul class="coin-movers-list">
                    {#each data.topGainers.slice(0, 3) as mover}
                        <li>
                            <a href={`/currencies/${mover.id}`}>{mover.name}</a>
                            <span
                                class={mover.priceChangePercentage24h >= 0
                                    ? "positive"
                                    : "negative"}
                            >
                                {percent.format(
                                    mover.priceChangePercentage24h / 100,
                                )}
                            </span>
                        </li>
                    {/each}
                </ul>
            </article>
        </aside>
    </div>
</section>
