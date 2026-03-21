<script lang="ts">
    import { browser } from "$app/environment";

    type ChartMode = "line" | "candles";
    type ChartRange = "24h" | "7d" | "1m" | "3m" | "ytd" | "1y" | "max";

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
            durationHours?: number;
            candleBuckets: number;
        }
    > = {
        "24h": {
            label: "24H",
            durationHours: 24,
            candleBuckets: 24,
        },
        "7d": {
            label: "7D",
            durationHours: 24 * 7,
            candleBuckets: 28,
        },
        "1m": {
            label: "1M",
            durationHours: 24 * 30,
            candleBuckets: 32,
        },
        "3m": {
            label: "3M",
            durationHours: 24 * 90,
            candleBuckets: 36,
        },
        ytd: {
            label: "YTD",
            durationHours: 24 * 365,
            candleBuckets: 40,
        },
        "1y": {
            label: "1Y",
            durationHours: 24 * 365,
            candleBuckets: 44,
        },
        max: {
            label: "MAX",
            candleBuckets: 48,
        },
    };

    let chartMode = $state<ChartMode>("line");
    let chartRange = $state<ChartRange>("24h");
    let chartRangeErrorByRange = $state<
        Partial<Record<ChartRange, string | null>>
    >({});
    let chartSeriesByRange = $state<
        Partial<
            Record<
                ChartRange,
                { prices: number[]; volumes: number[]; timestamps: number[] }
            >
        >
    >({});
    let chartFetchRequestId = 0;
    let chartSvg: SVGSVGElement | null = null;
    let hoveredIndex = $state<number | null>(null);

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

    const compactUsd = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
    });

    const shortTime = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });

    const shortDate = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
    });

    const hoverDateTime = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    function buildLinePath(values: number[], min: number, max: number): string {
        if (values.length < 2) {
            return "";
        }

        const range = max - min || 1;
        const step = plotWidth / (values.length - 1);

        return values
            .map((value, index) => {
                const x = plotLeft + step * index;
                const y = plotTop + ((max - value) / range) * priceHeight;
                return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(" ");
    }

    function buildAreaPath(values: number[], min: number, max: number): string {
        const line = buildLinePath(values, min, max);
        if (!line) {
            return "";
        }

        return `${line} L ${plotLeft + plotWidth} ${plotTop + priceHeight} L ${plotLeft} ${plotTop + priceHeight} Z`;
    }

    function buildOverviewPath(values: number[]): string {
        if (values.length < 2) {
            return "";
        }

        const localMin = Math.min(...values);
        const localMax = Math.max(...values);
        const localRange = localMax - localMin || 1;
        const step = plotWidth / (values.length - 1);

        return values
            .map((value, index) => {
                const x = plotLeft + step * index;
                const y =
                    overviewTop +
                    ((localMax - value) / localRange) * overviewHeight;
                return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(" ");
    }

    function formatTickTime(
        index: number,
        totalTicks: number,
        durationHours: number,
    ): string {
        const now = Date.now();
        const offsetHours =
            durationHours * (1 - index / Math.max(totalTicks - 1, 1));
        const date = new Date(now - offsetHours * 3600 * 1000);
        if (durationHours <= 48) {
            return shortTime.format(date);
        }

        return shortDate.format(date);
    }

    function buildCandles(
        values: number[],
        buckets: number,
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
        // When there are fewer data points than desired buckets, produce at most
        // one candle per data point rather than forcing a minimum chunk size of 2
        // (which would throw away half the data and produce wide, wick-less blobs).
        const effectiveBuckets = Math.max(1, Math.min(buckets, values.length));
        const chunkSize = Math.max(
            1,
            Math.floor(values.length / effectiveBuckets),
        );

        for (let i = 0; i < values.length; i += chunkSize) {
            const chunk = values.slice(
                i,
                Math.min(values.length, i + chunkSize),
            );
            if (chunk.length < 1) {
                continue;
            }

            candles.push({
                open: chunk[0],
                close: chunk[chunk.length - 1],
                high: Math.max(...chunk),
                low: Math.min(...chunk),
            });
        }

        return candles;
    }

    function toFallbackSeries(
        prices: number[],
        totalVolume24h: number,
    ): { prices: number[]; volumes: number[] } {
        const safePrices =
            prices.length > 1 ? prices : [coin.currentPrice, coin.currentPrice];
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

    function buildSyntheticTimestamps(
        pointCount: number,
        durationHours: number,
    ): number[] {
        if (pointCount <= 0) {
            return [];
        }

        const now = Date.now();
        const start = now - durationHours * 3600 * 1000;
        const step = pointCount > 1 ? (now - start) / (pointCount - 1) : 0;

        return Array.from({ length: pointCount }, (_, index) =>
            Math.round(start + step * index),
        );
    }

    function getYtdDurationHours(): number {
        const now = new Date();
        const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
        return Math.max(
            24,
            Math.floor((Date.now() - startOfYear) / (1000 * 60 * 60)),
        );
    }

    function getRangeDurationHours(range: ChartRange, pointCount = 0): number {
        if (range === "ytd") {
            return getYtdDurationHours();
        }

        if (range === "max") {
            const live = chartSeriesByRange.max?.timestamps;
            if (live && live.length > 1) {
                const first = live[0];
                const last = live[live.length - 1];
                const span = Math.floor((last - first) / (1000 * 60 * 60));
                if (span > 0) {
                    return span;
                }
            }

            if (pointCount > 1) {
                // MAX endpoint is typically daily granularity; derive span from points, not a fixed year cap.
                return (pointCount - 1) * 24;
            }

            return 24 * 30;
        }

        return chartRangeConfig[range].durationHours ?? 24 * 7;
    }

    function updateHoverFromPointer(event: PointerEvent): void {
        if (!chartSvg || filteredChartPrices.length < 2) {
            hoveredIndex = null;
            return;
        }

        const rect = chartSvg.getBoundingClientRect();
        const svgX = ((event.clientX - rect.left) / rect.width) * chartWidth;
        const clampedX = Math.min(
            plotLeft + plotWidth,
            Math.max(plotLeft, svgX),
        );
        const ratio = (clampedX - plotLeft) / plotWidth;
        const index = Math.round(ratio * (filteredChartPrices.length - 1));
        hoveredIndex = Math.min(
            filteredChartPrices.length - 1,
            Math.max(0, index),
        );
    }

    function clearHover(): void {
        hoveredIndex = null;
    }

    const chartSeries = $derived.by(() => {
        const remote = chartSeriesByRange[chartRange];
        if (remote && remote.prices.length > 1) {
            return remote;
        }

        // Only 7D has a meaningful server-provided seed in coin payload.
        // For other ranges, avoid reusing 7D-like data because it is misleading.
        if (chartRange !== "7d") {
            const flatPrices = [coin.currentPrice, coin.currentPrice];
            const flatVolumes = [
                coin.totalVolume24h / 24,
                coin.totalVolume24h / 24,
            ];
            return {
                prices: flatPrices,
                volumes: flatVolumes,
                timestamps: buildSyntheticTimestamps(
                    flatPrices.length,
                    getRangeDurationHours(chartRange, flatPrices.length),
                ),
            };
        }

        const fallbackPrices =
            coin.chartPrices7d?.length > 1
                ? coin.chartPrices7d
                : coin.sparkline7d;
        const fallbackVolumes =
            coin.chartVolumes7d?.length > 1 ? coin.chartVolumes7d : [];
        if (fallbackVolumes.length > 1) {
            return {
                prices: fallbackPrices,
                volumes: fallbackVolumes,
                timestamps: buildSyntheticTimestamps(
                    fallbackPrices.length,
                    getRangeDurationHours(chartRange, fallbackPrices.length),
                ),
            };
        }

        const fallback = toFallbackSeries(fallbackPrices, coin.totalVolume24h);
        return {
            ...fallback,
            timestamps: buildSyntheticTimestamps(
                fallback.prices.length,
                getRangeDurationHours(chartRange, fallback.prices.length),
            ),
        };
    });

    const filteredChartPrices = $derived(chartSeries.prices);
    const filteredChartVolumes = $derived.by(() => {
        if (chartSeries.volumes.length === filteredChartPrices.length) {
            return chartSeries.volumes;
        }

        if (chartSeries.volumes.length > filteredChartPrices.length) {
            return chartSeries.volumes.slice(
                chartSeries.volumes.length - filteredChartPrices.length,
            );
        }

        const seed =
            chartSeries.volumes[chartSeries.volumes.length - 1] ??
            coin.totalVolume24h / 24;
        return [
            ...chartSeries.volumes,
            ...new Array(
                filteredChartPrices.length - chartSeries.volumes.length,
            ).fill(seed),
        ];
    });
    const filteredChartTimestamps = $derived.by(() => {
        if (chartSeries.timestamps.length === filteredChartPrices.length) {
            return chartSeries.timestamps;
        }

        if (chartSeries.timestamps.length > filteredChartPrices.length) {
            return chartSeries.timestamps.slice(
                chartSeries.timestamps.length - filteredChartPrices.length,
            );
        }

        return buildSyntheticTimestamps(
            filteredChartPrices.length,
            getRangeDurationHours(chartRange, filteredChartPrices.length),
        );
    });

    const chartMin = $derived(
        Math.min(...filteredChartPrices, coin.currentPrice),
    );
    const chartMax = $derived(
        Math.max(...filteredChartPrices, coin.currentPrice),
    );
    const chartPadding = $derived(
        (chartMax - chartMin || chartMax || 1) * 0.12,
    );
    const scaledMin = $derived(Math.max(0, chartMin - chartPadding));
    const scaledMax = $derived(chartMax + chartPadding);
    const isPositive = $derived(
        filteredChartPrices[filteredChartPrices.length - 1] >=
            filteredChartPrices[0],
    );
    const linePath = $derived(
        buildLinePath(filteredChartPrices, scaledMin, scaledMax),
    );
    const areaPath = $derived(
        buildAreaPath(filteredChartPrices, scaledMin, scaledMax),
    );
    const overviewPath = $derived(buildOverviewPath(filteredChartPrices));
    const yLevels = $derived(
        Array.from(
            { length: 6 },
            (_, idx) => scaledMax - ((scaledMax - scaledMin) * idx) / 5,
        ),
    );
    const volumeMax = $derived(Math.max(...filteredChartVolumes, 1));
    const candles = $derived(
        buildCandles(
            filteredChartPrices,
            chartRangeConfig[chartRange].candleBuckets,
        ),
    );
    const chartDurationHours = $derived.by(() => {
        if (filteredChartTimestamps.length > 1) {
            const first = filteredChartTimestamps[0];
            const last =
                filteredChartTimestamps[filteredChartTimestamps.length - 1];
            const spanHours = Math.floor((last - first) / (1000 * 60 * 60));
            if (spanHours > 0) {
                return spanHours;
            }
        }

        return getRangeDurationHours(chartRange, filteredChartPrices.length);
    });
    const xTickLabels = $derived(
        Array.from({ length: 6 }, (_, idx) =>
            formatTickTime(idx, 6, chartDurationHours),
        ),
    );
    const currentPriceValue = $derived(coin.currentPrice);
    const currentPriceY = $derived(
        plotTop +
            ((scaledMax - currentPriceValue) / (scaledMax - scaledMin || 1)) *
                priceHeight,
    );
    const hoverX = $derived.by(() => {
        if (hoveredIndex === null || filteredChartPrices.length < 2) {
            return null;
        }

        return (
            plotLeft +
            (plotWidth * hoveredIndex) /
                Math.max(filteredChartPrices.length - 1, 1)
        );
    });
    const hoverPrice = $derived(
        hoveredIndex === null
            ? null
            : (filteredChartPrices[hoveredIndex] ?? null),
    );
    const hoverVolume = $derived(
        hoveredIndex === null
            ? null
            : (filteredChartVolumes[hoveredIndex] ?? null),
    );
    const hoverTimestamp = $derived(
        hoveredIndex === null
            ? null
            : (filteredChartTimestamps[hoveredIndex] ?? null),
    );
    const hoverPointY = $derived.by(() => {
        if (hoverPrice === null) {
            return null;
        }

        return (
            plotTop +
            ((scaledMax - hoverPrice) / (scaledMax - scaledMin || 1)) *
                priceHeight
        );
    });
    const hoverTooltipX = $derived.by(() => {
        if (hoverX === null) {
            return null;
        }

        return Math.min(chartWidth - 150, Math.max(150, hoverX));
    });
    const hoverTooltipY = $derived.by(() => {
        if (hoverPointY === null) {
            return null;
        }

        return Math.min(
            priceHeight + plotTop - 20,
            Math.max(plotTop + 16, hoverPointY - 78),
        );
    });
    const hoverDateLabel = $derived.by(() => {
        if (hoverTimestamp === null) {
            return "";
        }

        return hoverDateTime.format(new Date(hoverTimestamp));
    });
    $effect(() => {
        if (!browser) {
            return;
        }

        const range = chartRange;
        if (range !== "max" && chartSeriesByRange[range]?.prices.length) {
            return;
        }

        const requestId = ++chartFetchRequestId;
        void fetch(
            `/api/coins/${coin.id}/chart?range=${range}&_ts=${Date.now()}`,
            {
                cache: "no-store",
            },
        )
            .then(async (response) => {
                if (!response.ok) {
                    let errorText = `Chart request failed with status ${response.status}`;
                    try {
                        const payload = (await response.json()) as {
                            error?: string;
                            autoRefresh?: {
                                schedulerStarted: boolean;
                                running: boolean;
                                lastCycleStartedAt: number | null;
                                lastCycleFinishedAt: number | null;
                                lastCycleOk: boolean | null;
                                lastCycleError: string | null;
                                lastAdHocCoin: {
                                    coinId: string;
                                    startedAt: number;
                                    finishedAt: number | null;
                                    ok: boolean | null;
                                    error: string | null;
                                } | null;
                            };
                        };
                        if (payload.error) {
                            errorText = payload.error;
                        }
                    } catch {
                        // Keep default error text.
                    }

                    chartRangeErrorByRange = {
                        ...chartRangeErrorByRange,
                        [range]: errorText,
                    };
                    throw new Error(errorText);
                }

                const payload = (await response.json()) as {
                    prices?: number[];
                    volumes?: number[];
                    timestamps?: number[];
                    warning?: string;
                    autoRefresh?: {
                        schedulerStarted: boolean;
                        running: boolean;
                        lastCycleStartedAt: number | null;
                        lastCycleFinishedAt: number | null;
                        lastCycleOk: boolean | null;
                        lastCycleError: string | null;
                        lastAdHocCoin: {
                            coinId: string;
                            startedAt: number;
                            finishedAt: number | null;
                            ok: boolean | null;
                            error: string | null;
                        } | null;
                    };
                };

                const prices =
                    payload.prices?.filter((value) => Number.isFinite(value)) ??
                    [];
                if (requestId !== chartFetchRequestId || prices.length < 2) {
                    return;
                }

                const volumes =
                    payload.volumes?.filter((value) =>
                        Number.isFinite(value),
                    ) ?? toFallbackSeries(prices, coin.totalVolume24h).volumes;
                const timestamps =
                    payload.timestamps?.filter((value) =>
                        Number.isFinite(value),
                    ) ??
                    buildSyntheticTimestamps(
                        prices.length,
                        getRangeDurationHours(range, prices.length),
                    );

                chartSeriesByRange = {
                    ...chartSeriesByRange,
                    [range]: {
                        prices,
                        volumes:
                            volumes.length > 1
                                ? volumes
                                : toFallbackSeries(prices, coin.totalVolume24h)
                                      .volumes,
                        timestamps:
                            timestamps.length === prices.length
                                ? timestamps
                                : buildSyntheticTimestamps(
                                      prices.length,
                                      getRangeDurationHours(
                                          range,
                                          prices.length,
                                      ),
                                  ),
                    },
                };
                chartRangeErrorByRange = {
                    ...chartRangeErrorByRange,
                    [range]: null,
                };

                if (payload.warning) {
                    console.warn("[coin-chart]", {
                        phase: "fetch-warning",
                        coinId: coin.id,
                        range,
                        warning: payload.warning,
                    });
                }
            })
            .catch((error) => {
                console.warn("[coin-chart]", {
                    phase: "fetch-error",
                    coinId: coin.id,
                    range,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            });
    });
</script>

<article class="coin-chart-card">
    <div class="coin-chart-shell">
        <div
            class="coin-chart-toolbar"
            role="group"
            aria-label="Chart controls"
        >
            <div class="coin-chart-left">
                <div class="coin-chart-modes">
                    <button class="coin-chip active" type="button">Price</button
                    >
                    <button class="coin-chip" type="button">Mkt Cap</button>
                </div>

                <div class="coin-chart-type">
                    <button
                        class={`coin-chip ${chartMode === "line" ? "active" : ""}`}
                        type="button"
                        onclick={() => (chartMode = "line")}>Line</button
                    >
                    <button
                        class={`coin-chip ${chartMode === "candles" ? "active" : ""}`}
                        type="button"
                        onclick={() => (chartMode = "candles")}>Candles</button
                    >
                </div>
            </div>

            <div class="coin-chart-right">
                <div class="coin-chart-range">
                    {#each Object.entries(chartRangeConfig) as [key, value]}
                        <button
                            class={`coin-chip ${chartRange === key ? "active" : ""}`}
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
                bind:this={chartSvg}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                class="coin-custom-chart"
                role="img"
                aria-label={`${coin.name} price and volume chart`}
                onpointermove={updateHoverFromPointer}
                onpointerleave={clearHover}
            >
                <defs>
                    <linearGradient
                        id={`priceFill-${coin.id}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stop-color={isPositive
                                ? "rgba(32, 214, 141, 0.24)"
                                : "rgba(255, 77, 87, 0.24)"}
                        />
                        <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
                    </linearGradient>
                </defs>

                <rect
                    x={plotLeft}
                    y={plotTop}
                    width={plotWidth}
                    height={priceHeight}
                    class="coin-chart-plot-bg"
                />

                {#each yLevels as level}
                    <line
                        x1={plotLeft}
                        x2={plotLeft + plotWidth}
                        y1={plotTop +
                            ((scaledMax - level) /
                                (scaledMax - scaledMin || 1)) *
                                priceHeight}
                        y2={plotTop +
                            ((scaledMax - level) /
                                (scaledMax - scaledMin || 1)) *
                                priceHeight}
                        class="coin-chart-grid-line"
                    />
                    <text
                        x={rightLabelX}
                        y={plotTop +
                            ((scaledMax - level) /
                                (scaledMax - scaledMin || 1)) *
                                priceHeight +
                            4}
                        class="coin-chart-axis-label"
                        text-anchor="end"
                    >
                        {compactUsd.format(level)}
                    </text>
                {/each}

                {#if chartMode === "line"}
                    <path
                        d={areaPath}
                        class="coin-chart-area"
                        fill={`url(#priceFill-${coin.id})`}
                    />
                    <path
                        d={linePath}
                        class={`coin-chart-line ${isPositive ? "positive" : "negative"}`}
                    />
                {:else}
                    {#each candles as candle, index}
                        {@const candleStep =
                            plotWidth / Math.max(candles.length, 1)}
                        {@const cx = plotLeft + candleStep * (index + 0.5)}
                        {@const openY =
                            plotTop +
                            ((scaledMax - candle.open) /
                                (scaledMax - scaledMin || 1)) *
                                priceHeight}
                        {@const closeY =
                            plotTop +
                            ((scaledMax - candle.close) /
                                (scaledMax - scaledMin || 1)) *
                                priceHeight}
                        {@const highY =
                            plotTop +
                            ((scaledMax - candle.high) /
                                (scaledMax - scaledMin || 1)) *
                                priceHeight}
                        {@const lowY =
                            plotTop +
                            ((scaledMax - candle.low) /
                                (scaledMax - scaledMin || 1)) *
                                priceHeight}
                        {@const bodyY = Math.min(openY, closeY)}
                        {@const bodyH = Math.max(1.5, Math.abs(closeY - openY))}
                        <line
                            x1={cx}
                            x2={cx}
                            y1={highY}
                            y2={lowY}
                            class={`coin-candle-wick ${candle.close >= candle.open ? "up" : "down"}`}
                        />
                        <rect
                            x={cx - candleStep * 0.28}
                            y={bodyY}
                            width={candleStep * 0.56}
                            height={bodyH}
                            class={`coin-candle-body ${candle.close >= candle.open ? "up" : "down"}`}
                        />
                    {/each}
                {/if}

                {#if hoverX !== null && hoverPointY !== null}
                    <line
                        x1={hoverX}
                        x2={hoverX}
                        y1={plotTop}
                        y2={volumeTop + volumeHeight}
                        class="coin-hover-crosshair"
                    />
                    <circle
                        cx={hoverX}
                        cy={hoverPointY}
                        r="4.2"
                        class="coin-hover-dot"
                    />
                {/if}

                <line
                    x1={plotLeft}
                    x2={plotLeft + plotWidth}
                    y1={currentPriceY}
                    y2={currentPriceY}
                    class="coin-current-line"
                />
                <rect
                    x={plotLeft + plotWidth + 4}
                    y={currentPriceY - 12}
                    width="88"
                    height="24"
                    rx="6"
                    class={`coin-current-pill ${isPositive ? "positive" : "negative"}`}
                />
                <text
                    x={plotLeft + plotWidth + 60}
                    y={currentPriceY}
                    text-anchor="middle"
                    class="coin-current-pill-text"
                >
                    <tspan dy="0.32em"
                        >{compactUsd.format(currentPriceValue)}</tspan
                    >
                </text>

                <rect
                    x={plotLeft}
                    y={volumeTop}
                    width={plotWidth}
                    height={volumeHeight}
                    class="coin-volume-bg"
                />
                {#each filteredChartVolumes as volume, idx}
                    {@const barWidth = plotWidth / filteredChartVolumes.length}
                    {@const barH = (volume / volumeMax) * volumeHeight}
                    <rect
                        x={plotLeft + idx * barWidth + 0.4}
                        y={volumeTop + (volumeHeight - barH)}
                        width={Math.max(0.8, barWidth - 0.8)}
                        height={barH}
                        class={`coin-volume-bar ${hoveredIndex === idx ? "hovered" : ""}`}
                    />
                {/each}

                {#each xTickLabels as label, idx}
                    <text
                        x={plotLeft +
                            (plotWidth * idx) /
                                Math.max(xTickLabels.length - 1, 1)}
                        y={401}
                        text-anchor={idx === 0
                            ? "start"
                            : idx === xTickLabels.length - 1
                              ? "end"
                              : "middle"}
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

            {#if hoverTooltipX !== null && hoverTooltipY !== null && hoverPrice !== null && hoverVolume !== null}
                <div
                    class="coin-hover-tooltip"
                    style={`left: ${(hoverTooltipX / chartWidth) * 100}%; top: ${(hoverTooltipY / chartHeight) * 100}%;`}
                >
                    <p class="coin-hover-tooltip-date">{hoverDateLabel}</p>
                    <p class="coin-hover-tooltip-row">
                        <span>Price</span>
                        <strong>{compactUsd.format(hoverPrice)}</strong>
                    </p>
                    <p class="coin-hover-tooltip-row">
                        <span>Vol</span>
                        <strong>{compactUsd.format(hoverVolume)}</strong>
                    </p>
                </div>
            {/if}
        </div>
    </div>
</article>
