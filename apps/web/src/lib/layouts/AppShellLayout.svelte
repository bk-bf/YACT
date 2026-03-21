<script lang="ts">
    import { browser } from "$app/environment";
    import { navigating, page } from "$app/stores";
    import RouteProgress from "../components/RouteProgress.svelte";

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
        coins?: Array<unknown>;
        global?: GlobalMarketSummary;
        headlines?: CryptoHeadline[];
        highlights?: {
            trending?: Array<unknown>;
            topGainers?: Array<unknown>;
        };
        snapshotTs?: number;
        ts?: number;
        stale?: boolean;
        error?: string;
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

    // Fallback sentinel used when real data is not yet available.
    // All numeric fields are NaN so format helpers render "--" rather than "0".
    const NULL_GLOBAL: GlobalMarketSummary = {
        totalMarketCapUsd: NaN,
        totalVolumeUsd: NaN,
        marketCapChangePercentage24hUsd: NaN,
        btcDominance: NaN,
        ethDominance: NaN,
        totalExchanges: NaN,
        activeCryptocurrencies: NaN,
        gasGwei: null,
    };

    let sharedGlobal = $state<GlobalMarketSummary | null>(null);
    let sharedHeadlines = $state<CryptoHeadline[]>([]);
    let activeNavigationKey = $state<string | null>(null);

    const pageGlobalForShell = $derived(
        ($page.data?.global as GlobalMarketSummary | undefined) ?? null,
    );
    const effectiveGlobal = $derived(
        sharedGlobal ??
            (pageGlobalForShell && hasMeaningfulGlobal(pageGlobalForShell)
                ? pageGlobalForShell
                : null),
    );
    // displayGlobal is always non-null so the headbar never disappears.
    const displayGlobal = $derived(effectiveGlobal ?? NULL_GLOBAL);
    const isGlobalReady = $derived(effectiveGlobal !== null);
    const topbarHeadlines = $derived(
        (sharedHeadlines.length > 0
            ? sharedHeadlines
            : (($page.data?.headlines as CryptoHeadline[] | undefined) ?? [])
        ).slice(0, 5),
    );

    const tickerDuration = $derived(
        topbarHeadlines.length === 0
            ? 30
            : Math.max(
                  20,
                  topbarHeadlines.reduce((acc, h) => acc + h.title.length, 0) /
                      8,
              ),
    );

    function hasMeaningfulGlobal(global: GlobalMarketSummary): boolean {
        return (
            global.totalMarketCapUsd > 0 ||
            global.totalVolumeUsd > 0 ||
            global.activeCryptocurrencies > 0 ||
            global.totalExchanges > 0
        );
    }

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

    function formatSignedPct(value: number | null | undefined): string {
        if (value === null || value === undefined || !Number.isFinite(value)) {
            return "--";
        }
        return signedPercent.format(value / 100);
    }

    $effect(() => {
        const pageGlobal = $page.data?.global as
            | GlobalMarketSummary
            | undefined;
        if (pageGlobal && hasMeaningfulGlobal(pageGlobal)) {
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
                    if (
                        !cancelled &&
                        payload.global &&
                        hasMeaningfulGlobal(payload.global)
                    ) {
                        sharedGlobal = payload.global;
                    }

                    if (!cancelled) {
                        window.dispatchEvent(
                            new CustomEvent("yact:markets-sync", {
                                detail: payload,
                            }),
                        );
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

    // Fix BUG-002: listen for global data dispatched by page-level recovery fetches
    // so the headbar updates immediately without waiting for the 30s shell poll.
    $effect(() => {
        if (!browser) {
            return;
        }

        const onGlobalReady = (event: Event) => {
            const global = (event as CustomEvent<GlobalMarketSummary>).detail;
            if (global && hasMeaningfulGlobal(global)) {
                sharedGlobal = global;
            }
        };

        window.addEventListener("yact:global-ready", onGlobalReady);
        return () => {
            window.removeEventListener("yact:global-ready", onGlobalReady);
        };
    });

    $effect(() => {
        if (!browser) {
            return;
        }

        const onClick = (event: MouseEvent) => {
            const target = event.target as Element | null;
            if (!target) {
                return;
            }

            const interactive = target.closest(
                'a, button, [role="button"], input[type="button"], input[type="submit"]',
            ) as HTMLElement | null;

            if (!interactive) {
                return;
            }

            const tag = interactive.tagName.toLowerCase();
            const label =
                (
                    interactive.getAttribute("aria-label") ??
                    interactive.textContent ??
                    ""
                )
                    .replace(/\s+/g, " ")
                    .trim()
                    .slice(0, 120) || null;
            const href =
                tag === "a"
                    ? (interactive as HTMLAnchorElement).getAttribute("href")
                    : null;

            console.info("[ui-event]", {
                type: "click",
                path: $page.url.pathname,
                tag,
                label,
                href,
            });
        };

        const onSubmit = (event: SubmitEvent) => {
            const form = event.target as HTMLFormElement | null;
            if (!form) {
                return;
            }

            console.info("[ui-event]", {
                type: "submit",
                path: $page.url.pathname,
                action: form.getAttribute("action") || null,
                method: (form.getAttribute("method") || "get").toLowerCase(),
            });
        };

        document.addEventListener("click", onClick, true);
        document.addEventListener("submit", onSubmit, true);

        return () => {
            document.removeEventListener("click", onClick, true);
            document.removeEventListener("submit", onSubmit, true);
        };
    });

    $effect(() => {
        if (!browser) {
            return;
        }

        if ($navigating?.to?.url) {
            const key = `${$navigating.from?.url.pathname ?? "<unknown>"}->${$navigating.to.url.pathname}`;
            if (activeNavigationKey !== key) {
                activeNavigationKey = key;
                console.info("[ui-event]", {
                    type: "navigation-start",
                    from: $navigating.from?.url.pathname ?? null,
                    to: $navigating.to.url.pathname,
                    willUnload: $navigating.willUnload ?? false,
                });
            }
            return;
        }

        if (activeNavigationKey !== null) {
            console.info("[ui-event]", {
                type: "navigation-end",
                path: $page.url.pathname,
            });
            activeNavigationKey = null;
        }
    });
</script>

<div class="app-shell">
    <RouteProgress />

    <section
        class={`market-floating-bar${isGlobalReady ? "" : " market-floating-bar--loading"}`}
        aria-label="Pinned market stats"
        aria-busy={!isGlobalReady}
    >
        <div class="market-floating-stats" aria-label="Live market stats">
            <span class="market-floating-item"
                >Coins: {formatInteger(
                    displayGlobal.activeCryptocurrencies,
                )}</span
            >
            <span class="market-floating-item"
                >Exchanges: {formatInteger(displayGlobal.totalExchanges)}</span
            >
            <span class="market-floating-item"
                >Market Cap: {formatCompactUsd(displayGlobal.totalMarketCapUsd)}
                <span
                    class={displayGlobal.marketCapChangePercentage24hUsd >= 0
                        ? "positive"
                        : "negative"}
                    >{formatSignedPct(
                        displayGlobal.marketCapChangePercentage24hUsd,
                    )}</span
                ></span
            >
            <span class="market-floating-item"
                >24h Vol: {formatCompactUsd(displayGlobal.totalVolumeUsd)}</span
            >
            <span class="market-floating-item"
                >Dominance: BTC {formatOneDecimalPercent(
                    displayGlobal.btcDominance,
                )}%</span
            >
            <span class="market-floating-item"
                >ETH {formatOneDecimalPercent(
                    displayGlobal.ethDominance,
                )}%</span
            >
            <span class="market-floating-item"
                >Gas: {formatGasGwei(displayGlobal.gasGwei)} GWEI</span
            >
        </div>

        {#if topbarHeadlines.length > 0}
            <div class="news-pill-wrap" aria-label="Latest crypto headlines">
                <span class="news-pill-label">📰 News</span>
                <div class="news-ticker-overflow">
                    <div
                        class="news-ticker-inner"
                        style="animation-duration: {tickerDuration}s"
                        aria-live="off"
                    >
                        {#each [...topbarHeadlines, ...topbarHeadlines] as headline}
                            <a
                                class="news-ticker-item"
                                href={headline.url}
                                target="_blank"
                                rel="noreferrer">{headline.title}</a
                            >
                            <span class="news-ticker-sep" aria-hidden="true"
                                >◆</span
                            >
                        {/each}
                    </div>
                </div>
            </div>
        {:else}
            <div
                class="news-pill-wrap news-pill-empty"
                aria-label="No news available"
            >
                <span class="news-pill-label">📰 News</span>
                <span class="news-ticker-placeholder"
                    >No headlines right now</span
                >
            </div>
        {/if}
    </section>

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
