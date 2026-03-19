<script lang="ts">
  import M3Button from "../lib/components/M3Button.svelte";

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

  const compactUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  });

  const compactNumber = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  });

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

  function featuredHeadlines() {
    return data.headlines.slice(0, 3);
  }

  function extraHeadlines() {
    return data.headlines.slice(3);
  }

  const sparklineWidth = 140;
  const sparklineHeight = 42;

  function sparklinePath(
    points: number[],
    width = sparklineWidth,
    height = sparklineHeight,
  ): string {
    if (!points.length) return "";
    if (points.length === 1)
      return `M 0 ${height / 2} L ${width} ${height / 2}`;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const stepX = width / (points.length - 1);

    return points
      .map((value, index) => {
        const x = index * stepX;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }

  function chartDirectionClass(
    points: number[],
  ): "chart-positive" | "chart-negative" {
    if (points.length < 2) return "chart-negative";
    return points[points.length - 1] >= points[0]
      ? "chart-positive"
      : "chart-negative";
  }

  function formatHeadlineDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return headlineDate.format(date);
  }
</script>

<svelte:head>
  <title>YACT Top 100 Markets</title>
</svelte:head>

<section class="market-overview">
  <div class="market-overview-head">
    <div>
      <h1>Cryptocurrency Prices by Market Cap</h1>
      <p class="market-overview-subtitle">
        The global crypto market cap today is
        <strong>{compactUsd.format(data.global.totalMarketCapUsd)}</strong>, a
        <span
          class={data.global.marketCapChangePercentage24hUsd >= 0
            ? "positive"
            : "negative"}
        >
          {signedPercent.format(
            data.global.marketCapChangePercentage24hUsd / 100,
          )}
        </span>
        change in the last 24 hours.
      </p>
    </div>
  </div>

  <section class="news-section" aria-label="Top crypto headlines">
    <div class="news-section-head">
      <h2>Top Crypto Headlines</h2>
      <span
        >{featuredHeadlines().length} of {data.headlines.length} stories</span
      >
    </div>

    {#if data.headlines.length === 0}
      <p class="muted">No headlines available right now.</p>
    {:else}
      <ul class="news-list">
        {#each featuredHeadlines() as headline}
          <li>
            <a
              href={headline.url}
              target="_blank"
              rel="noreferrer"
              class="news-link"
            >
              {headline.title}
            </a>
            <span class="news-meta"
              >{headline.source} • {formatHeadlineDate(
                headline.publishedAt,
              )}</span
            >
          </li>
        {/each}
      </ul>

      {#if extraHeadlines().length > 0}
        <details class="news-more">
          <summary>View more</summary>
          <ul class="news-list news-list-extra">
            {#each extraHeadlines() as headline}
              <li>
                <a
                  href={headline.url}
                  target="_blank"
                  rel="noreferrer"
                  class="news-link"
                >
                  {headline.title}
                </a>
                <span class="news-meta"
                  >{headline.source} • {formatHeadlineDate(
                    headline.publishedAt,
                  )}</span
                >
              </li>
            {/each}
          </ul>
        </details>
      {/if}
    {/if}
  </section>

  <div class="overview-grid">
    <article class="overview-stat-card">
      <h3>{compactUsd.format(data.global.totalMarketCapUsd)}</h3>
      <p>
        Market Cap
        <span
          class={data.global.marketCapChangePercentage24hUsd >= 0
            ? "positive"
            : "negative"}
        >
          {signedPercent.format(
            data.global.marketCapChangePercentage24hUsd / 100,
          )}
        </span>
      </p>
      <svg
        class={`sparkline sparkline-market ${chartDirectionClass(data.global.marketCapSparkline7d)}`}
        viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="7 day market cap chart"
      >
        <path d={sparklinePath(data.global.marketCapSparkline7d)} />
      </svg>
    </article>

    <article class="overview-stat-card">
      <h3>{compactUsd.format(data.global.totalVolumeUsd)}</h3>
      <p>24h Trading Volume</p>
      <p class="muted">BTC Dominance: {data.global.btcDominance.toFixed(2)}%</p>
      <p class="muted">
        Active Cryptocurrencies: {data.global.activeCryptocurrencies}
      </p>
    </article>

    <article class="overview-list-card">
      <header>
        <h3>Trending</h3>
        <button type="button" class="inline-link">View more</button>
      </header>
      <ul>
        {#each data.highlights.trending as coin}
          <li>
            <span>{coin.name}</span>
            <span>{usd.format(coin.currentPrice)}</span>
          </li>
        {/each}
      </ul>
    </article>

    <article class="overview-list-card">
      <header>
        <h3>Top Gainers</h3>
        <button type="button" class="inline-link">View more</button>
      </header>
      <ul>
        {#each data.highlights.topGainers as coin}
          <li>
            <span>{coin.name}</span>
            <span
              class={coin.priceChangePercentage24h >= 0
                ? "positive"
                : "negative"}
            >
              {signedPercent.format(coin.priceChangePercentage24h / 100)}
            </span>
          </li>
        {/each}
      </ul>
    </article>
  </div>
</section>

<section class="market-section">
  <h2 class="m3-surface-title">Top 100 Cryptocurrencies By Market Cap</h2>
  <p class="m3-surface-subtitle">Live source: {data.source}</p>
  {#if data.warning}
    <p class="warning-text">{data.warning}</p>
  {/if}

  {#if data.error}
    <p class="error-text">Unable to load market data: {data.error}</p>
  {:else}
    <div class="table-filter-bar" role="toolbar" aria-label="Market filters">
      <div class="table-filter-left">
        <button class="table-filter-item active" type="button">All</button>
        <button class="table-filter-item" type="button">Highlights</button>
        <button class="table-filter-item" type="button">Base Ecosystem</button>
        <button class="table-filter-item" type="button">Categories</button>
        <button class="table-filter-item" type="button"
          >Payment Solutions</button
        >
        <button class="table-filter-item" type="button">Perpetuals</button>
        <button class="table-filter-item" type="button">DEX</button>
      </div>
      <div class="table-filter-right">
        <button class="table-filter-action" type="button">Customize</button>
      </div>
    </div>

    <div class="market-headline-row">
      <span class="market-meta-item">Live Market Table</span>
      <span class="market-meta-item">Rows: {data.coins.length}</span>
      {#if data.stale}
        <span class="market-meta-item warning">Stale Snapshot</span>
      {/if}
    </div>

    <div class="market-table-wrap">
      <table class="market-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Coin</th>
            <th>Price</th>
            <th>24h</th>
            <th>7d</th>
            <th>Market Cap</th>
            <th>Volume (24h)</th>
            <th>Circulating Supply</th>
          </tr>
        </thead>
        <tbody>
          {#each data.coins as coin}
            <tr tabindex="0">
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
              <td>
                <svg
                  class={`sparkline sparkline-coin ${chartDirectionClass(coin.sparkline7d)}`}
                  viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`}
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`${coin.name} 7 day chart`}
                >
                  <path d={sparklinePath(coin.sparkline7d)} />
                </svg>
              </td>
              <td>{compactUsd.format(coin.marketCap)}</td>
              <td>{compactUsd.format(coin.totalVolume24h)}</td>
              <td>
                {compactNumber.format(coin.circulatingSupply)}
                {coin.symbol.toUpperCase()}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="m3-button-row" style="margin-top: 1rem;">
    <M3Button href="/watchlist" tone="tonal">Open Watchlist Workspace</M3Button>
    <M3Button href="/" tone="outlined">Refresh Top 100</M3Button>
  </div>
</section>
