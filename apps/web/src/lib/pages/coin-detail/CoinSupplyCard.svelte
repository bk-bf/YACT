<script lang="ts">
    import type { CoinBreakdown } from "./coin-detail-page.data";
    import { usd, formatWhole } from "../../utils/formatters";

    const { coin }: { coin: CoinBreakdown } = $props();

    const dateTime = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    function formatOptionalDate(value: string | null): string {
        if (!value) return "--";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "--";
        return dateTime.format(date);
    }

    const hasFiniteMaxSupply = $derived(
        typeof coin.maxSupply === "number" &&
            Number.isFinite(coin.maxSupply) &&
            coin.maxSupply > 0,
    );
    const maxSupplyLabel = $derived(
        hasFiniteMaxSupply
            ? `${formatWhole(coin.maxSupply)} ${coin.symbol.toUpperCase()}`
            : coin.maxSupply === null
              ? "∞"
              : "--",
    );
</script>

<article class="coin-rail-card">
    <h3>Supply</h3>
    <ul class="coin-rail-list">
        <li>
            <span>Circulating</span>
            <strong>
                {formatWhole(coin.circulatingSupply)}
                {coin.symbol.toUpperCase()}
            </strong>
        </li>
        <li>
            <span>Max supply</span>
            <strong>{maxSupplyLabel}</strong>
        </li>
        <li>
            <span>All-time high</span>
            <strong
                >{coin.allTimeHigh > 0
                    ? usd.format(coin.allTimeHigh)
                    : "--"}</strong
            >
        </li>
        <li>
            <span>ATH date</span>
            <strong>{formatOptionalDate(coin.allTimeHighDate)}</strong>
        </li>
    </ul>
</article>
