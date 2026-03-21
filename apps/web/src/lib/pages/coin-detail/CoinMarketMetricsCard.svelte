<script lang="ts">
    import type { CoinBreakdown } from "./coin-detail-page.data";
    import { formatStableCompactUsd } from "../../utils/formatters";
    import CoinRailCard from "./CoinRailCard.svelte";

    const { coin }: { coin: CoinBreakdown } = $props();

    const hasFiniteMaxSupply = $derived(
        typeof coin.maxSupply === "number" &&
            Number.isFinite(coin.maxSupply) &&
            coin.maxSupply > 0,
    );
    const fdvLabel = $derived(
        hasFiniteMaxSupply
            ? formatStableCompactUsd(coin.maxSupply! * coin.currentPrice)
            : coin.maxSupply === null
              ? "∞"
              : "--",
    );
    const volToMcapPercent = $derived(
        coin.marketCap > 0 ? (coin.totalVolume24h / coin.marketCap) * 100 : 0,
    );
</script>

<CoinRailCard title="Market Metrics">
    <ul class="coin-rail-list">
        <li>
            <span>Market cap</span>
            <strong>{formatStableCompactUsd(coin.marketCap)}</strong>
        </li>
        <li>
            <span>Volume (24h)</span>
            <strong>{formatStableCompactUsd(coin.totalVolume24h)}</strong>
        </li>
        <li>
            <span>Vol/Mcap ratio</span>
            <strong>{volToMcapPercent.toFixed(2)}%</strong>
        </li>
        <li>
            <span>FDV</span>
            <strong>{fdvLabel}</strong>
        </li>
    </ul>
</CoinRailCard>
