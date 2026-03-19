<script lang="ts">
    import "../app.css";
    import { page } from "$app/stores";
</script>

<div class="app-shell">
    <header class="top-nav">
        <div class="brand">
            <span class="brand-name">YACT</span>
            <span class="brand-tagline">Cycle-aware crypto tracker</span>
        </div>

        <nav class="nav-links">
            <a
                class="nav-link"
                href="/"
                aria-current={$page.url.pathname === "/" ? "page" : undefined}
                >Markets</a
            >
            <a
                class="nav-link"
                href="/watchlist"
                aria-current={$page.url.pathname === "/watchlist"
                    ? "page"
                    : undefined}>Watchlist Preview</a
            >
        </nav>
    </header>

    <slot />
</div>
