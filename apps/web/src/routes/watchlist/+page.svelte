<script lang="ts">
    import { browser } from "$app/environment";
    import M3Surface from "../../lib/components/M3Surface.svelte";
    import M3Button from "../../lib/components/M3Button.svelte";
    import { useProgressiveDataLoad } from "../../lib/composables/useProgressiveDataLoad.svelte";
    import { loadWatchlistPageData } from "../../lib/pages/watchlist/watchlist-page.data";

    let { data } = $props();
    const progressive = useProgressiveDataLoad(() => data);
    const viewData = $derived(progressive.getViewData());

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

    const btc = $derived(viewData.items[0]);
    const eth = $derived(viewData.items[1]);

    function formatPrice(value: number): string {
        return value > 0 ? usd.format(value) : "--";
    }

    function formatPercent(value: number): string {
        return value !== 0 ? percent.format(value / 100) : "--";
    }

    function formatVolume(value: number): string {
        return value > 0 ? compactUsd.format(value) : "--";
    }

    $effect(() => {
        if (!browser) {
            return;
        }

        void progressive.loadCritical(() => loadWatchlistPageData(fetch));
    });
</script>

<svelte:head>
    <title>YACT Watchlist Preview</title>
</svelte:head>

<M3Surface
    title="Watchlist Surface Preview"
    subtitle="This route exists to manually verify reusable M3 tokens and component styling across multiple pages."
    tonal={true}
>
    <div class="grid-two">
        <!-- TODO(T-004, see .docs/features/open/ROADMAP.md): Replace placeholder BTC card with real watchlist module fed by live data. -->
        <article class="m3-surface padded elevated">
            <h3>BTC Core Signals</h3>
            <p>
                Tracking halving-cycle context with baseline probability
                signals.
            </p>
            <span class="metric-chip"
                >Price: {formatPrice(btc.currentPrice)}</span
            >
            <span class="metric-chip"
                >24h: {formatPercent(btc.priceChangePercentage24h)}</span
            >
            <span class="metric-chip"
                >Volume: {formatVolume(btc.totalVolume24h)}</span
            >
        </article>

        <!-- TODO(T-004, see .docs/features/open/ROADMAP.md): Replace placeholder ETH card with real watchlist module fed by live data. -->
        <article class="m3-surface padded">
            <h3>ETH Momentum Signals</h3>
            <p>
                Short-term trend and liquidity context for watchlist comparison.
            </p>
            <span class="metric-chip"
                >Price: {formatPrice(eth.currentPrice)}</span
            >
            <span class="metric-chip"
                >24h: {formatPercent(eth.priceChangePercentage24h)}</span
            >
            <span class="metric-chip"
                >Volume: {formatVolume(eth.totalVolume24h)}</span
            >
        </article>
    </div>

    <div class="m3-button-row" style="margin-top: 1rem;">
        <!-- TODO(T-004, see .docs/features/open/ROADMAP.md): Replace back navigation placeholder with final watchlist-to-markets flow. -->
        <M3Button href="/" tone="filled">Back To Markets</M3Button>
        <!-- TODO(T-004, see .docs/features/open/ROADMAP.md): Replace route-check placeholder with real watchlist refresh/sync action. -->
        <M3Button href="/watchlist" tone="outlined"
            >Refresh Route Check</M3Button
        >
    </div>
</M3Surface>
