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
    <div
        class={`route-progress ${$navigating ? "active" : ""}`}
        aria-hidden="true"
    >
        <span class="route-progress-bar"></span>
    </div>

    {#if effectiveGlobal}
        {@const topbarHeadlines = (
            sharedHeadlines.length > 0
                ? sharedHeadlines
                : ($page.data?.headlines ?? [])
        ).slice(0, 5)}
        <section class="market-floating-bar" aria-label="Pinned market stats">
            <div class="market-floating-stats" aria-label="Live market stats">
                <span class="market-floating-item"
                    >Coins: {formatInteger(
                        effectiveGlobal.activeCryptocurrencies,
                    )}</span
                >
                <span class="market-floating-item"
                    >Exchanges: {formatInteger(
                        effectiveGlobal.totalExchanges,
                    )}</span
                >
                <span class="market-floating-item"
                    >Market Cap: {formatCompactUsd(
                        effectiveGlobal.totalMarketCapUsd,
                    )}
                    <span
                        class={effectiveGlobal.marketCapChangePercentage24hUsd >=
                        0
                            ? "positive"
                            : "negative"}
                        >{signedPercent.format(
                            effectiveGlobal.marketCapChangePercentage24hUsd /
                                100,
                        )}</span
                    ></span
                >
                <span class="market-floating-item"
                    >24h Vol: {formatCompactUsd(
                        effectiveGlobal.totalVolumeUsd,
                    )}</span
                >
                <span class="market-floating-item"
                    >Dominance: BTC {formatOneDecimalPercent(
                        effectiveGlobal.btcDominance,
                    )}%</span
                >
                <span class="market-floating-item"
                    >ETH {formatOneDecimalPercent(
                        effectiveGlobal.ethDominance,
                    )}%</span
                >
                <span class="market-floating-item"
                    >Gas: {formatGasGwei(effectiveGlobal.gasGwei)} GWEI</span
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
