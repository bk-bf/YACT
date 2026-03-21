<script lang="ts">
    import { browser } from "$app/environment";
    import { navigating, page } from "$app/stores";

    interface GlobalMarketSummary {
        totalMarketCapUsd: number;
        totalVolumeUsd: number;
        marketCapChangePercentage24hUsd: number;
        btcDominance: number;
        ethDominance: number;
        totalExchanges: number;
        activeCryptocurrencies: number;
        gasGwei: number | null;
    }

    interface CryptoHeadline {
        id: string;
        title: string;
        url: string;
        source: string;
        publishedAt: string;
    }

    interface MarketsLayoutPayload {
        global?: GlobalMarketSummary;
    }

    interface HeadlinesPayload {
        headlines?: CryptoHeadline[];
    }

    let { children } = $props();

    const primaryNav = [
        "Cryptocurrencies",
        "Exchanges",
        "Community",
        "Products",
        "Learn",
    ];

    const integerNumber = new Intl.NumberFormat("en-US");

    const signedPercent = new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
        signDisplay: "always",
    });

    const headlineDate = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    let sharedGlobal = $state<GlobalMarketSummary | null>(null);
    let sharedHeadlines = $state<CryptoHeadline[]>([]);

    function formatHeadlineDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return headlineDate.format(date);
    }

    function formatGasGwei(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "--";
        }

        if (value < 1) {
            return value.toFixed(3);
        }

        if (value < 10) {
            return value.toFixed(2);
        }

        return value.toFixed(1);
    }

    function formatOneDecimalPercent(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "--";
        }
        return value.toFixed(1);
    }

    function formatCompactUsd(value: number | null | undefined): string {
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

    function formatInteger(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "--";
        }
        return integerNumber.format(value);
    }

    $effect(() => {
        const pageGlobal = $page.data?.global as
            | GlobalMarketSummary
            | undefined;
        if (pageGlobal) {
            sharedGlobal = pageGlobal;
        }

        const pageHeadlines = $page.data?.headlines as
            | CryptoHeadline[]
            | undefined;
        if (Array.isArray(pageHeadlines) && pageHeadlines.length > 0) {
            sharedHeadlines = pageHeadlines;
        }
    });

    $effect(() => {
        if (!browser) {
            return;
        }

        let cancelled = false;

        const syncFloatingData = async () => {
            try {
                const marketsResponse = await fetch(
                    `/api/markets?_ts=${Date.now()}`,
                    {
                        cache: "no-store",
                    },
                );
                if (marketsResponse.ok) {
                    const payload =
                        (await marketsResponse.json()) as MarketsLayoutPayload;
                    if (!cancelled && payload.global) {
                        sharedGlobal = payload.global;
                    }
                }
            } catch {
                // Ignore transient fetch errors; keep last known values.
            }

            try {
                const headlinesResponse = await fetch(
                    `/api/headlines?_ts=${Date.now()}`,
                    {
                        cache: "no-store",
                    },
                );
                if (headlinesResponse.ok) {
                    const payload =
                        (await headlinesResponse.json()) as HeadlinesPayload;
                    if (!cancelled && Array.isArray(payload.headlines)) {
                        sharedHeadlines = payload.headlines;
                    }
                }
            } catch {
                // Ignore transient fetch errors; keep last known values.
            }
        };

        void syncFloatingData();
        const timer = window.setInterval(() => {
            void syncFloatingData();
        }, 30_000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    });
</script>

<div class="app-shell">
    <div
        class={`route-progress ${$navigating ? "active" : ""}`}
        aria-hidden="true"
    >
        <span class="route-progress-bar"></span>
    </div>

    {#if sharedGlobal ?? ($page.data?.global as GlobalMarketSummary | undefined)}
        {@const global =
            sharedGlobal ?? ($page.data?.global as GlobalMarketSummary)}
        {@const topbarHeadlines = (
            sharedHeadlines.length > 0
                ? sharedHeadlines
                : ($page.data?.headlines ?? [])
        ).slice(0, 5)}
        <section class="market-floating-bar" aria-label="Pinned market stats">
            <div class="market-floating-stats" aria-label="Live market stats">
                <span class="market-floating-item"
                    >Coins: {formatInteger(global.activeCryptocurrencies)}</span
                >
                <span class="market-floating-item"
                    >Exchanges: {formatInteger(global.totalExchanges)}</span
                >
                <span class="market-floating-item"
                    >Market Cap: {formatCompactUsd(global.totalMarketCapUsd)}
                    <span
                        class={global.marketCapChangePercentage24hUsd >= 0
                            ? "positive"
                            : "negative"}
                        >{signedPercent.format(
                            global.marketCapChangePercentage24hUsd / 100,
                        )}</span
                    ></span
                >
                <span class="market-floating-item"
                    >24h Vol: {formatCompactUsd(global.totalVolumeUsd)}</span
                >
                <span class="market-floating-item"
                    >Dominance: BTC {formatOneDecimalPercent(
                        global.btcDominance,
                    )}%</span
                >
                <span class="market-floating-item"
                    >ETH {formatOneDecimalPercent(global.ethDominance)}%</span
                >
                <span class="market-floating-item"
                    >Gas: {formatGasGwei(global.gasGwei)} GWEI</span
                >
            </div>

            <details class="floating-headlines-dropdown">
                <summary class="market-floating-item floating-headlines-pill">
                    Headlines
                </summary>

                <div
                    class="floating-headlines-panel"
                    aria-label="Top crypto headlines"
                >
                    {#if topbarHeadlines.length === 0}
                        <p class="floating-headlines-empty">
                            No headlines available right now.
                        </p>
                    {:else}
                        <ul class="floating-headlines-list">
                            {#each topbarHeadlines as headline}
                                <li>
                                    <a
                                        href={headline.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        class="floating-headline-link"
                                    >
                                        {headline.title}
                                    </a>
                                    <span class="floating-headline-meta"
                                        >{headline.source} • {formatHeadlineDate(
                                            headline.publishedAt,
                                        )}</span
                                    >
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </details>
        </section>
    {/if}

    <header class="terminal-header">
        <div class="top-nav-main">
            <a class="brand" href="/" aria-label="Go to markets home">
                <span class="brand-badge">YACT</span>
                <span class="brand-name">YACT</span>
            </a>

            <nav class="menu-links" aria-label="Primary market menu">
                {#each primaryNav as navItem}
                    <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Replace placeholder top-nav menu item with real route and data-backed destination. -->
                    <button class="menu-link" type="button">{navItem}</button>
                {/each}
            </nav>

            <div class="top-nav-right">
                <nav class="route-links" aria-label="Primary routes">
                    <a
                        class="route-link"
                        href="/"
                        aria-current={$page.url.pathname === "/"
                            ? "page"
                            : undefined}>Markets</a
                    >
                    <a
                        class="route-link"
                        href="/watchlist"
                        aria-current={$page.url.pathname === "/watchlist"
                            ? "page"
                            : undefined}>Watchlist</a
                    >
                </nav>

                <div class="menu-actions">
                    <!-- TODO(T-010, see .docs/features/open/ROADMAP.md): Wire Sign In placeholder action to real authentication flow. -->
                    <button class="menu-action filled" type="button"
                        >Sign In</button
                    >
                </div>
            </div>
        </div>
    </header>

    {@render children?.()}
</div>
