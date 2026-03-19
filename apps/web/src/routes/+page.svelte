<script lang="ts">
  import M3Button from "../lib/components/M3Button.svelte";
  import M3Surface from "../lib/components/M3Surface.svelte";

  let { data } = $props();

  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  const percent = new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 2,
    signDisplay: "always",
  });
</script>

<svelte:head>
  <title>YACT Markets</title>
</svelte:head>

<M3Surface
  title="Top 10 Crypto Market Snapshot"
  subtitle={`Live source: ${data.source}`}
  elevated={true}
>
  {#if data.error}
    <p class="error-text">Unable to load market data: {data.error}</p>
  {:else}
    <div class="market-table-wrap m3-surface">
      <table class="market-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Coin</th>
            <th>Price</th>
            <th>24h</th>
            <th>Market Cap</th>
          </tr>
        </thead>
        <tbody>
          {#each data.coins as coin}
            <tr>
              <td>{coin.marketCapRank}</td>
              <td>
                <div class="coin-name">
                  <img
                    src={coin.image}
                    alt={coin.name}
                    width="24"
                    height="24"
                  />
                  <span>{coin.name} ({coin.symbol.toUpperCase()})</span>
                </div>
              </td>
              <td>{usd.format(coin.currentPrice)}</td>
              <td
                class={coin.priceChangePercentage24h >= 0
                  ? "positive"
                  : "negative"}
              >
                {percent.format(coin.priceChangePercentage24h / 100)}
              </td>
              <td>{usd.format(coin.marketCap)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="m3-button-row" style="margin-top: 1rem;">
    <M3Button href="/watchlist" tone="tonal">Open Watchlist Preview</M3Button>
    <M3Button href="/" tone="outlined">Refresh Market Snapshot</M3Button>
  </div>
</M3Surface>
