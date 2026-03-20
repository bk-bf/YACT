<script lang="ts">
    import { browser } from "$app/environment";
    import { invalidateAll } from "$app/navigation";
    import CoinTerminalChart from "../../components/CoinTerminalChart.svelte";

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

    const shortDate = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
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
    const low24h = $derived(coin.low24h ?? coin.currentPrice);
    const high24h = $derived(coin.high24h ?? coin.currentPrice);
    const dayRangeSpread = $derived(Math.max(0, high24h - low24h));
    const dayRangeProgress = $derived(
        dayRangeSpread > 0
            ? clamp(
                  ((coin.currentPrice - low24h) / dayRangeSpread) * 100,
                  0,
                  100,
              )
            : 50,
    );
    const athDistancePct = $derived(
        coin.allTimeHigh > 0
            ? ((coin.currentPrice - coin.allTimeHigh) / coin.allTimeHigh) * 100
            : null,
    );
    const atlDistancePct = $derived(
        coin.allTimeLow > 0
            ? ((coin.currentPrice - coin.allTimeLow) / coin.allTimeLow) * 100
            : null,
    );

    let converterBtcInput = $state("1");
    let converterUsdInput = $state("");
    let converterLastEdited = $state<"btc" | "usd">("btc");

    function normalizeNumericInput(value: string): string {
        const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
        const parts = cleaned.split(".");
        if (parts.length <= 1) {
            return cleaned;
        }

        return `${parts[0]}.${parts.slice(1).join("")}`;
    }

    function parseNumericInput(value: string): number | null {
        const normalized = normalizeNumericInput(value);
        if (!normalized || normalized === ".") {
            return null;
        }

        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatInputNumber(value: number, decimals: number): string {
        const fixed = value.toFixed(decimals);
        return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    }

    function addThousandsSeparators(value: string): string {
        const normalized = normalizeNumericInput(value);
        if (!normalized) {
            return "";
        }

        const hasTrailingDot = normalized.endsWith(".");
        const [intPartRaw, decimalPart = ""] = normalized.split(".");
        const intPart = intPartRaw.length > 0 ? intPartRaw : "0";
        const groupedInt = intPart
            .replace(/^0+(?=\d)/, "")
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        if (hasTrailingDot) {
            return `${groupedInt}.`;
        }

        if (decimalPart.length > 0) {
            return `${groupedInt}.${decimalPart}`;
        }

        return groupedInt;
    }

    function formatGroupedInputNumber(value: number, decimals: number): string {
        return addThousandsSeparators(formatInputNumber(value, decimals));
    }

    function handleConverterBtcInput(event: Event): void {
        const target = event.currentTarget as HTMLInputElement;
        converterLastEdited = "btc";
        converterBtcInput = normalizeNumericInput(target.value);
    }

    function handleConverterUsdInput(event: Event): void {
        const target = event.currentTarget as HTMLInputElement;
        converterLastEdited = "usd";
        converterUsdInput = addThousandsSeparators(target.value);
    }

    $effect(() => {
        const price = coin.currentPrice;
        if (!Number.isFinite(price) || price <= 0) {
            return;
        }

        if (converterLastEdited === "btc") {
            const btcValue = parseNumericInput(converterBtcInput);
            converterUsdInput =
                btcValue !== null
                    ? formatGroupedInputNumber(btcValue * price, 2)
                    : "";
            return;
        }

        const usdValue = parseNumericInput(converterUsdInput);
        converterBtcInput =
            usdValue !== null ? formatInputNumber(usdValue / price, 8) : "";
    });

    function formatDateShort(value: string | null): string {
        if (!value) return "--";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "--";
        }

        return shortDate.format(date);
    }

    $effect(() => {
        if (!browser) {
            return;
        }

        let cancelled = false;
        let lastCoinSnapshotTs = data.coinSnapshotTs ?? null;
        let lastMarketSnapshotTs = data.marketsSnapshotTs ?? null;

        const pollSnapshotMeta = async () => {
            try {
                const response = await fetch(
                    `/api/debug/snapshot-meta?coinId=${encodeURIComponent(coin.id)}&_ts=${Date.now()}`,
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
                        coinId: coin.id,
                        previousCoinTs,
                        nextCoinTs: payload.coinSnapshotTs ?? null,
                        previousMarketTs,
                        nextMarketTs: payload.marketSnapshotTs ?? null,
                        reason: coinUpdated
                            ? "coin-db-updated"
                            : "market-db-updated",
                    });
                    await invalidateAll();
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("[auto-ui-refresh]", {
                        page: "coin",
                        coinId: coin.id,
                        phase: "poll-error",
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
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
</script>

<svelte:head>
    <title>{coin.name} Markets | YACT</title>
</svelte:head>

<section class="coin-terminal">
    {#if data.stale}
        <p class="warning-text">
            Showing cached coin data while live detail data is unavailable.
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
                <h3>{coin.symbol.toUpperCase()} to USD converter</h3>
                <div class="coin-converter-box" aria-label="Coin converter">
                    <div class="coin-converter-row">
                        <span>{coin.symbol.toUpperCase()}</span>
                        <input
                            class="coin-converter-input"
                            type="text"
                            inputmode="decimal"
                            value={converterBtcInput}
                            oninput={handleConverterBtcInput}
                            aria-label={`${coin.symbol.toUpperCase()} amount`}
                        />
                    </div>
                    <div class="coin-converter-row">
                        <span>USD</span>
                        <input
                            class="coin-converter-input"
                            type="text"
                            inputmode="decimal"
                            value={converterUsdInput}
                            oninput={handleConverterUsdInput}
                            aria-label="USD amount"
                        />
                    </div>
                </div>
            </article>

            <article class="coin-rail-card">
                <h3>Price performance</h3>
                <div class="coin-range-head">
                    <div>
                        <small>Low (24h)</small>
                        <strong>{usd.format(low24h)}</strong>
                    </div>
                    <div class="coin-range-head-right">
                        <small>High (24h)</small>
                        <strong>{usd.format(high24h)}</strong>
                    </div>
                </div>
                <div class="coin-range-track" aria-label="24h range">
                    <span
                        class="coin-range-thumb"
                        style={`left:${dayRangeProgress}%`}
                    ></span>
                </div>
                <ul class="coin-rail-list coin-performance-list">
                    <li>
                        <span>All-time high</span>
                        <strong>
                            {coin.allTimeHigh > 0
                                ? usd.format(coin.allTimeHigh)
                                : "--"}
                        </strong>
                    </li>
                    <li>
                        <span>{formatDateShort(coin.allTimeHighDate)}</span>
                        <strong
                            class={athDistancePct !== null
                                ? athDistancePct >= 0
                                    ? "positive"
                                    : "negative"
                                : ""}
                        >
                            {athDistancePct !== null
                                ? percent.format(athDistancePct / 100)
                                : "--"}
                        </strong>
                    </li>
                    <li>
                        <span>All-time low</span>
                        <strong>
                            {coin.allTimeLow > 0
                                ? usd.format(coin.allTimeLow)
                                : "--"}
                        </strong>
                    </li>
                    <li>
                        <span>{formatDateShort(coin.allTimeLowDate)}</span>
                        <strong
                            class={atlDistancePct !== null
                                ? atlDistancePct >= 0
                                    ? "positive"
                                    : "negative"
                                : ""}
                        >
                            {atlDistancePct !== null
                                ? percent.format(atlDistancePct / 100)
                                : "--"}
                        </strong>
                    </li>
                </ul>
                <a
                    href={coin.coingeckoUrl}
                    target="_blank"
                    rel="noreferrer"
                    class="coin-inline-link"
                >
                    See historical data <span aria-hidden="true">↗</span>
                </a>
            </article>

            <article class="coin-rail-card">
                <h3>Market Metrics</h3>
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
                <h3>24h Price Momentum</h3>
                <div
                    class="sentiment-bar"
                    aria-label="Bullish vs bearish momentum from 24h price change"
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
