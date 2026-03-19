<script lang="ts">
    import "../app.css";
    import { page } from "$app/stores";

    const primaryNav = [
        "Cryptocurrencies",
        "Exchanges",
        "Community",
        "Products",
        "Learn",
    ];

    const compactUsd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
    });

    const integerNumber = new Intl.NumberFormat("en-US");

    const signedPercent = new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 2,
        signDisplay: "always",
    });

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
</script>

<div class="app-shell">
    {#if $page.url.pathname === "/" && $page.data?.global}
        {@const global = $page.data.global}
        <section class="market-floating-bar" aria-label="Pinned market stats">
            <span class="market-floating-item"
                >Coins: {integerNumber.format(
                    global.activeCryptocurrencies,
                )}</span
            >
            <span class="market-floating-item"
                >Exchanges: {integerNumber.format(global.totalExchanges)}</span
            >
            <span class="market-floating-item"
                >Market Cap: {compactUsd.format(global.totalMarketCapUsd)}
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
                >24h Vol: {compactUsd.format(global.totalVolumeUsd)}</span
            >
            <span class="market-floating-item"
                >Dominance: BTC {global.btcDominance.toFixed(1)}%</span
            >
            <span class="market-floating-item"
                >ETH {global.ethDominance.toFixed(1)}%</span
            >
            <span class="market-floating-item"
                >Gas: {formatGasGwei(global.gasGwei)} GWEI</span
            >
        </section>
    {/if}

    <header class="terminal-header">
        <div class="top-nav-main">
            <div class="brand">
                <span class="brand-badge">YACT</span>
                <span class="brand-name">YACT Markets Terminal</span>
            </div>

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

    <slot />
</div>
