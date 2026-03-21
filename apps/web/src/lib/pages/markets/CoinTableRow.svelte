<script lang="ts">
    import type { MarketCoin } from "../../types/market";
    import {
        isCoinJitterEligible,
    } from "../../effects/usePriceJitter.svelte";
    import {
        usd,
        percent,
        compactNumber,
        formatDetailedUsd,
        formatStableCompactUsd,
    } from "../../utils/formatters";
    import {
        sparklinePath,
        chartDirectionClass,
        SPARKLINE_WIDTH,
        SPARKLINE_HEIGHT,
    } from "../../utils/sparkline";

    const {
        coin,
        jitter,
    }: {
        coin: MarketCoin;
        jitter: {
            getFlash(k: string): string | null;
            getValue(k: string, b: number): number;
        };
    } = $props();

    function formatJitterUsd(key: string, base: number): string {
        return formatDetailedUsd(jitter.getValue(key, base));
    }
</script>

<tr>
    <td>{coin.marketCapRank}</td>
    <td>
        <div class="coin-name">
            <a
                class="coin-row-anchor"
                href={`/currencies/${encodeURIComponent(coin.id)}`}
                aria-label={`Open ${coin.name} breakdown`}
            >
                <img src={coin.image} alt={coin.name} width="24" height="24" />
                <span>{coin.name} ({coin.symbol.toUpperCase()})</span>
            </a>
        </div>
    </td>
    <td
        class={jitter.getFlash(coin.id) === "up"
            ? "price-tick-up"
            : jitter.getFlash(coin.id) === "down"
              ? "price-tick-down"
              : ""}
    >
        {isCoinJitterEligible(coin)
            ? formatJitterUsd(coin.id, coin.currentPrice)
            : usd.format(coin.currentPrice)}
    </td>
    <td
        class={coin.priceChangePercentage24h >= 0 ? "positive" : "negative"}
    >
        {percent.format(coin.priceChangePercentage24h / 100)}
    </td>
    <td>
        <svg
            class={`sparkline sparkline-coin ${chartDirectionClass(coin.sparkline7d)}`}
            viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
            preserveAspectRatio="none"
            role="img"
            aria-label={`${coin.name} 7 day chart`}
        >
            <path d={sparklinePath(coin.sparkline7d)} />
        </svg>
    </td>
    <td>{formatStableCompactUsd(coin.marketCap)}</td>
    <td>{formatStableCompactUsd(coin.totalVolume24h)}</td>
    <td>
        {compactNumber.format(coin.circulatingSupply)}
        {coin.symbol.toUpperCase()}
    </td>
</tr>
