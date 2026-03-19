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
</script>

<div class="app-shell">
    <header class="terminal-header">
        <div class="top-nav-main">
            <div class="brand">
                <span class="brand-badge">YACT</span>
                <span class="brand-name">YACT Markets Terminal</span>
            </div>

            <nav class="menu-links" aria-label="Primary market menu">
                {#each primaryNav as navItem}
                    <!-- TODO: Replace placeholder top-nav menu item with real route and data-backed destination. -->
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
                    <!-- TODO: Wire Sign In placeholder action to real authentication flow. -->
                    <button class="menu-action filled" type="button"
                        >Sign In</button
                    >
                </div>
            </div>
        </div>
    </header>

    <slot />
</div>
