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
                    <button class="menu-link" type="button">{navItem}</button>
                {/each}
            </nav>

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
                <button class="menu-action outlined" type="button"
                    >Portfolio</button
                >
                <button class="menu-action outlined" type="button"
                    >Alerts</button
                >
                <button class="menu-action outlined" type="button"
                    >Customize</button
                >
                <button class="menu-action filled" type="button">Sign In</button
                >
            </div>
        </div>
    </header>

    <slot />
</div>
