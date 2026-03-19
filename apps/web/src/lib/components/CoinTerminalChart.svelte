<script lang="ts">
    import { browser } from '$app/environment';

    type ChartMode = 'line' | 'candles';
    type ChartRange = '24h' | '7d' | '1m' | '3m' | 'ytd' | '1y' | 'max';

    interface CoinChartData {
        id: string;
        name: string;
        symbol: string;
        currentPrice: number;
        totalVolume24h: number;
        sparkline7d: number[];
        chartPrices7d: number[];
        chartVolumes7d: number[];
    }

    let { coin } = $props<{ coin: CoinChartData }>();

    const chartRangeConfig: Record<
        ChartRange,
        {
            label: string;
            durationHours: number;
            candleBuckets: number;
        }
    > = {
        '24h': {
            label: '24H',
            durationHours: 24,
            candleBuckets: 24
        },
        '7d': {
            label: '7D',
            durationHours: 24 * 7,
            candleBuckets: 28
        },
        '1m': {
            label: '1M',
            durationHours: 24 * 30,
            candleBuckets: 32
        },
        '3m': {
            label: '3M',
            durationHours: 24 * 90,
            candleBuckets: 36
        },
        ytd: {
            label: 'YTD',
            durationHours: 24 * 180,
            candleBuckets: 40
        },
        '1y': {
            label: '1Y',
            durationHours: 24 * 365,
            candleBuckets: 44
        },
        max: {
            label: 'MAX',
            durationHours: 24 * 730,
            candleBuckets: 48
        }
    };

    let chartMode = $state<ChartMode>('line');
    let chartRange = $state<ChartRange>('24h');
    let chartSeriesByRange = $state<Partial<Record<ChartRange, { prices: number[]; volumes: number[] }>>>({});
    let chartFetchRequestId = 0;

    const chartWidth = 1000;
    const chartHeight = 470;
    const plotLeft = 14;
    const plotTop = 16;
    const plotWidth = 860;
    const priceHeight = 292;
    const volumeTop = 320;
    const volumeHeight = 56;
    const overviewTop = 420;
    const overviewHeight = 30;
    const rightLabelX = 960;

    const compactUsd = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2
    });

    const shortTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });

    const shortDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
    });

    function buildLinePath(values: number[], min: number, max: number): string {
        if (values.length < 2) {
            return '';
        }

        const range = max - min || 1;
        const step = plotWidth / (values.length - 1);

        return values
            .map((value, index) => {
                const x = plotLeft + step * index;
                const y = plotTop + ((max - value) / range) * priceHeight;
                return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(' ');
    }

    function buildAreaPath(values: number[], min: number, max: number): string {
        const line = buildLinePath(values, min, max);
        if (!line) {
            return '';
        }

        return `${line} L ${plotLeft + plotWidth} ${plotTop + priceHeight} L ${plotLeft} ${plotTop + priceHeight} Z`;
    }

    function buildOverviewPath(values: number[]): string {
        if (values.length < 2) {
            return '';
        }

        const localMin = Math.min(...values);
        const localMax = Math.max(...values);
        const localRange = localMax - localMin || 1;
        const step = plotWidth / (values.length - 1);

        return values
            .map((value, index) => {
                const x = plotLeft + step * index;
                const y = overviewTop + ((localMax - value) / localRange) * overviewHeight;
                return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(' ');
    }

    function formatTickTime(index: number, totalTicks: number, durationHours: number): string {
        const now = Date.now();
        const offsetHours = durationHours * (1 - index / Math.max(totalTicks - 1, 1));
        const date = new Date(now - offsetHours * 3600 * 1000);
        if (durationHours <= 48) {
            return shortTime.format(date);
        }

        return shortDate.format(date);
    }

    function buildCandles(
        values: number[],
        buckets: number
    ): Array<{ open: number; close: number; high: number; low: number }> {
        if (values.length < 2) {
            return [];
        }

        const candles: Array<{
            open: number;
            close: number;
            high: number;
            low: number;
        }> = [];
        const chunkSize = Math.max(2, Math.floor(values.length / buckets));

        for (let i = 0; i < values.length - 1; i += chunkSize) {
            const chunk = values.slice(i, Math.min(values.length, i + chunkSize));
            if (chunk.length < 2) {
                continue;
            }

            candles.push({
                open: chunk[0],
                close: chunk[chunk.length - 1],
                high: Math.max(...chunk),
                low: Math.min(...chunk)
            });
        }

        return candles;
    }

    function toFallbackSeries(prices: number[], totalVolume24h: number): { prices: number[]; volumes: number[] } {
        const safePrices = prices.length > 1 ? prices : [coin.currentPrice, coin.currentPrice];
        const volumes = safePrices.map((price, index, arr) => {
            if (index === 0) {
                return totalVolume24h / 24;
            }

            const prev = arr[index - 1] || price;
            const relativeMove = Math.abs((price - prev) / (prev || 1));
            return (totalVolume24h / 24) * (1 + relativeMove * 4);
        });

        return { prices: safePrices, volumes };
    }

    const chartSeries = $derived.by(() => {
        const remote = chartSeriesByRange[chartRange];
        if (remote && remote.prices.length > 1) {
            return remote;
        }

        const fallbackPrices = coin.chartPrices7d?.length > 1 ? coin.chartPrices7d : coin.sparkline7d;
        const fallbackVolumes = coin.chartVolumes7d?.length > 1 ? coin.chartVolumes7d : [];
        if (fallbackVolumes.length > 1) {
            return {
                prices: fallbackPrices,
                volumes: fallbackVolumes
            };
        }

        return toFallbackSeries(fallbackPrices, coin.totalVolume24h);
    });

    const filteredChartPrices = $derived(chartSeries.prices);
    const filteredChartVolumes = $derived(chartSeries.volumes);

    const chartMin = $derived(Math.min(...filteredChartPrices, coin.currentPrice));
    const chartMax = $derived(Math.max(...filteredChartPrices, coin.currentPrice));
    const chartPadding = $derived((chartMax - chartMin || chartMax || 1) * 0.12);
    const scaledMin = $derived(Math.max(0, chartMin - chartPadding));
    const scaledMax = $derived(chartMax + chartPadding);
    const isPositive = $derived(filteredChartPrices[filteredChartPrices.length - 1] >= filteredChartPrices[0]);
    const linePath = $derived(buildLinePath(filteredChartPrices, scaledMin, scaledMax));
    const areaPath = $derived(buildAreaPath(filteredChartPrices, scaledMin, scaledMax));
    const overviewPath = $derived(buildOverviewPath(filteredChartPrices));
    const yLevels = $derived(
        Array.from({ length: 6 }, (_, idx) => scaledMax - ((scaledMax - scaledMin) * idx) / 5)
    );
    const volumeMax = $derived(Math.max(...filteredChartVolumes, 1));
    const candles = $derived(buildCandles(filteredChartPrices, chartRangeConfig[chartRange].candleBuckets));
    const chartDurationHours = $derived(chartRangeConfig[chartRange].durationHours);
    const xTickLabels = $derived(Array.from({ length: 6 }, (_, idx) => formatTickTime(idx, 6, chartDurationHours)));
    const currentPriceValue = $derived(coin.currentPrice);
    const currentPriceY = $derived(
        plotTop + ((scaledMax - currentPriceValue) / (scaledMax - scaledMin || 1)) * priceHeight
    );

    $effect(() => {
        if (!browser) {
            return;
        }

        const range = chartRange;
        if (chartSeriesByRange[range]?.prices.length) {
            return;
        }

        const requestId = ++chartFetchRequestId;
        void fetch(`/api/coins/${coin.id}/chart?range=${range}`)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Chart request failed with status ${response.status}`);
                }

                const payload = (await response.json()) as {
                    prices?: number[];
                    volumes?: number[];
                };

                const prices = payload.prices?.filter((value) => Number.isFinite(value)) ?? [];
                if (requestId !== chartFetchRequestId || prices.length < 2) {
                    return;
                }

                const volumes =
                    payload.volumes?.filter((value) => Number.isFinite(value)) ??
                    toFallbackSeries(prices, coin.totalVolume24h).volumes;

                chartSeriesByRange = {
                    ...chartSeriesByRange,
                    [range]: {
                        prices,
                        volumes: volumes.length > 1 ? volumes : toFallbackSeries(prices, coin.totalVolume24h).volumes
                    }
                };
            })
            .catch(() => {
                // Keep existing fallback series when a range request fails.
            });
    });
</script>

<article class="coin-chart-card">
    <div class="coin-chart-shell">
        <div class="coin-chart-toolbar" role="group" aria-label="Chart controls">
            <div class="coin-chart-left">
                <div class="coin-chart-modes">
                    <button class="coin-chip active" type="button">Price</button>
                    <button class="coin-chip" type="button">Mkt Cap</button>
                </div>

                <div class="coin-chart-type">
                    <button
                        class={`coin-chip ${chartMode === 'line' ? 'active' : ''}`}
                        type="button"
                        onclick={() => (chartMode = 'line')}
                    >Line</button>
                    <button
                        class={`coin-chip ${chartMode === 'candles' ? 'active' : ''}`}
                        type="button"
                        onclick={() => (chartMode = 'candles')}
                    >Candles</button>
                </div>
            </div>

            <div class="coin-chart-right">
                <div class="coin-chart-range">
                    {#each Object.entries(chartRangeConfig) as [key, value]}
                        <button
                            class={`coin-chip ${chartRange === key ? 'active' : ''}`}
                            type="button"
                            onclick={() => (chartRange = key as ChartRange)}
                        >
                            {value.label}
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <div class="coin-widget-wrap" aria-label={`${coin.name} custom chart`}>
            <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                class="coin-custom-chart"
                role="img"
                aria-label={`${coin.name} price and volume chart`}
            >
                <defs>
                    <linearGradient id={`priceFill-${coin.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="0%"
                            stop-color={isPositive ? 'rgba(32, 214, 141, 0.24)' : 'rgba(255, 77, 87, 0.24)'}
                        />
                        <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
                    </linearGradient>
                </defs>

                <rect x={plotLeft} y={plotTop} width={plotWidth} height={priceHeight} class="coin-chart-plot-bg" />

                {#each yLevels as level}
                    <line
                        x1={plotLeft}
                        x2={plotLeft + plotWidth}
                        y1={plotTop + ((scaledMax - level) / (scaledMax - scaledMin || 1)) * priceHeight}
                        y2={plotTop + ((scaledMax - level) / (scaledMax - scaledMin || 1)) * priceHeight}
                        class="coin-chart-grid-line"
                    />
                    <text
                        x={rightLabelX}
                        y={plotTop + ((scaledMax - level) / (scaledMax - scaledMin || 1)) * priceHeight + 4}
                        class="coin-chart-axis-label"
                        text-anchor="end"
                    >
                        {compactUsd.format(level)}
                    </text>
                {/each}

                {#if chartMode === 'line'}
                    <path d={areaPath} class="coin-chart-area" fill={`url(#priceFill-${coin.id})`} />
                    <path d={linePath} class={`coin-chart-line ${isPositive ? 'positive' : 'negative'}`} />
                {:else}
                    {#each candles as candle, index}
                        {@const candleStep = plotWidth / Math.max(candles.length, 1)}
                        {@const cx = plotLeft + candleStep * (index + 0.5)}
                        {@const openY =
                            plotTop + ((scaledMax - candle.open) / (scaledMax - scaledMin || 1)) * priceHeight}
                        {@const closeY =
                            plotTop + ((scaledMax - candle.close) / (scaledMax - scaledMin || 1)) * priceHeight}
                        {@const highY =
                            plotTop + ((scaledMax - candle.high) / (scaledMax - scaledMin || 1)) * priceHeight}
                        {@const lowY =
                            plotTop + ((scaledMax - candle.low) / (scaledMax - scaledMin || 1)) * priceHeight}
                        {@const bodyY = Math.min(openY, closeY)}
                        {@const bodyH = Math.max(1.5, Math.abs(closeY - openY))}
                        <line
                            x1={cx}
                            x2={cx}
                            y1={highY}
                            y2={lowY}
                            class={`coin-candle-wick ${candle.close >= candle.open ? 'up' : 'down'}`}
                        />
                        <rect
                            x={cx - candleStep * 0.28}
                            y={bodyY}
                            width={candleStep * 0.56}
                            height={bodyH}
                            class={`coin-candle-body ${candle.close >= candle.open ? 'up' : 'down'}`}
                        />
                    {/each}
                {/if}

                <line x1={plotLeft} x2={plotLeft + plotWidth} y1={currentPriceY} y2={currentPriceY} class="coin-current-line" />
                <rect
                    x={plotLeft + plotWidth + 4}
                    y={currentPriceY - 12}
                    width="88"
                    height="24"
                    rx="6"
                    class={`coin-current-pill ${isPositive ? 'positive' : 'negative'}`}
                />
                <text
                    x={plotLeft + plotWidth + 48}
                    y={currentPriceY + 5}
                    text-anchor="middle"
                    class="coin-current-pill-text"
                >
                    {compactUsd.format(currentPriceValue)}
                </text>

                <rect x={plotLeft} y={volumeTop} width={plotWidth} height={volumeHeight} class="coin-volume-bg" />
                {#each filteredChartVolumes as volume, idx}
                    {@const barWidth = plotWidth / filteredChartVolumes.length}
                    {@const barH = (volume / volumeMax) * volumeHeight}
                    <rect
                        x={plotLeft + idx * barWidth + 0.4}
                        y={volumeTop + (volumeHeight - barH)}
                        width={Math.max(0.8, barWidth - 0.8)}
                        height={barH}
                        class="coin-volume-bar"
                    />
                {/each}

                {#each xTickLabels as label, idx}
                    <text
                        x={plotLeft + (plotWidth * idx) / Math.max(xTickLabels.length - 1, 1)}
                        y={401}
                        text-anchor={idx === 0 ? 'start' : idx === xTickLabels.length - 1 ? 'end' : 'middle'}
                        class="coin-chart-time-label"
                    >
                        {label}
                    </text>
                {/each}

                <line
                    x1={plotLeft}
                    x2={plotLeft + plotWidth}
                    y1={overviewTop + overviewHeight + 1}
                    y2={overviewTop + overviewHeight + 1}
                    class="coin-overview-baseline"
                />
                <path d={overviewPath} class="coin-overview-line" />
            </svg>
        </div>
    </div>
</article>
