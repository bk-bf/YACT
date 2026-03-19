import {
    getCoinBreakdown,
    getCoinChartSeries,
    getGlobalMarketSummary,
    getTopMarketCoins,
    type CoinChartRange
} from './coingecko';
import type { MarketCoin } from '../types/market';
import { listTrackedCoinIds, writeCoinBreakdownSnapshot, writeCoinChartSnapshot } from './persistentCoinSnapshot';
import { writePersistentMarketSnapshot } from './persistentMarketSnapshot';

const AUTO_REFRESH_INTERVAL_MS = 5 * 60_000;
const MARKET_SWEEP_LIMIT = 100;
const AUTO_REFRESH_LOG_PREFIX = '[auto-refresh]';
const CHART_RANGES: CoinChartRange[] = ['24h', '7d', '1m', '3m', 'ytd', '1y', 'max'];

let autoRefreshStarted = false;
let autoRefreshTimer: NodeJS.Timeout | null = null;
let autoRefreshRunning = false;

interface AutoRefreshStatus {
    intervalMs: number;
    schedulerStarted: boolean;
    running: boolean;
    nextCycleAt: number | null;
    cycleCount: number;
    lastCycleStartedAt: number | null;
    lastCycleFinishedAt: number | null;
    lastCycleOk: boolean | null;
    lastCycleError: string | null;
    lastSweepCoinCount: number;
    lastAdHocCoin: {
        coinId: string;
        startedAt: number;
        finishedAt: number | null;
        ok: boolean | null;
        error: string | null;
    } | null;
}

interface AutoRefreshEvent {
    ts: number;
    type:
        | 'scheduler-started'
        | 'cycle-start'
        | 'cycle-success'
        | 'cycle-failed'
        | 'cycle-skipped'
        | 'ad-hoc-coin-start'
        | 'ad-hoc-coin-success'
        | 'ad-hoc-coin-failed';
    detail?: Record<string, unknown>;
}

const AUTO_REFRESH_EVENT_CAP = 80;
const autoRefreshEvents: AutoRefreshEvent[] = [];

function pushAutoRefreshEvent(event: AutoRefreshEvent): void {
    autoRefreshEvents.push(event);
    if (autoRefreshEvents.length > AUTO_REFRESH_EVENT_CAP) {
        autoRefreshEvents.splice(0, autoRefreshEvents.length - AUTO_REFRESH_EVENT_CAP);
    }
}

export function getAutoRefreshEvents(limit = 30): AutoRefreshEvent[] {
    const safeLimit = Math.max(1, Math.min(200, limit));
    return autoRefreshEvents.slice(-safeLimit);
}

const autoRefreshStatus: AutoRefreshStatus = {
    intervalMs: AUTO_REFRESH_INTERVAL_MS,
    schedulerStarted: false,
    running: false,
    nextCycleAt: null,
    cycleCount: 0,
    lastCycleStartedAt: null,
    lastCycleFinishedAt: null,
    lastCycleOk: null,
    lastCycleError: null,
    lastSweepCoinCount: 0,
    lastAdHocCoin: null
};

export function getAutoRefreshStatus(): AutoRefreshStatus {
    return { ...autoRefreshStatus };
}

async function refreshMarketsFromUpstream(fetchFn: typeof fetch): Promise<MarketCoin[]> {
    const startedAt = Date.now();
    console.info(`${AUTO_REFRESH_LOG_PREFIX} markets refresh start`, {
        startedAt
    });

    const coins = await getTopMarketCoins(fetchFn);
    const global = await getGlobalMarketSummary(fetchFn, coins);
    await writePersistentMarketSnapshot('coingecko-auto-refresh', coins, global);

    console.info(`${AUTO_REFRESH_LOG_PREFIX} markets refresh success`, {
        startedAt,
        finishedAt: Date.now(),
        coinCount: coins.length
    });

    return coins;
}

export async function refreshTrackedCoinData(fetchFn: typeof fetch, marketCoinIds: string[] = []): Promise<void> {
    const trackedCoinIds = await listTrackedCoinIds();
    const normalizedMarketIds = marketCoinIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .slice(0, MARKET_SWEEP_LIMIT);
    const coinIds = Array.from(new Set([...trackedCoinIds, ...normalizedMarketIds]));

    const startedAt = Date.now();
    console.info(`${AUTO_REFRESH_LOG_PREFIX} tracked coin refresh start`, {
        startedAt,
        trackedCoinCount: trackedCoinIds.length,
        marketCoinCount: normalizedMarketIds.length,
        sweepCoinCount: coinIds.length
    });
    autoRefreshStatus.lastSweepCoinCount = coinIds.length;

    if (!coinIds.length) {
        console.info(`${AUTO_REFRESH_LOG_PREFIX} tracked coin refresh noop`, {
            startedAt,
            finishedAt: Date.now(),
            reason: 'no-sweep-coins'
        });
        return;
    }

    let coinSuccessCount = 0;
    let coinFailureCount = 0;
    let chartSuccessCount = 0;
    let chartFailureCount = 0;

    // Refresh tracked coins sequentially to reduce upstream burst pressure.
    for (const coinId of coinIds) {
        const coinStartedAt = Date.now();
        console.info(`${AUTO_REFRESH_LOG_PREFIX} coin refresh start`, {
            coinId,
            startedAt: coinStartedAt
        });

        try {
            const breakdown = await getCoinBreakdown(fetchFn, coinId);
            await writeCoinBreakdownSnapshot(coinId, breakdown);
            coinSuccessCount += 1;
            console.info(`${AUTO_REFRESH_LOG_PREFIX} coin refresh success`, {
                coinId,
                startedAt: coinStartedAt,
                finishedAt: Date.now(),
                source: breakdown.source
            });

            for (const range of CHART_RANGES) {
                const chartStartedAt = Date.now();
                console.info(`${AUTO_REFRESH_LOG_PREFIX} chart refresh start`, {
                    coinId,
                    range,
                    startedAt: chartStartedAt
                });

                try {
                    const series = await getCoinChartSeries(fetchFn, coinId, range);
                    if (series.source === 'coingecko' || series.source === 'cryptocompare') {
                        await writeCoinChartSnapshot(coinId, range, series);
                        chartSuccessCount += 1;
                        console.info(`${AUTO_REFRESH_LOG_PREFIX} chart refresh success`, {
                            coinId,
                            range,
                            startedAt: chartStartedAt,
                            finishedAt: Date.now(),
                            source: series.source,
                            points: series.prices.length
                        });
                    } else {
                        console.warn(`${AUTO_REFRESH_LOG_PREFIX} chart refresh skipped`, {
                            coinId,
                            range,
                            startedAt: chartStartedAt,
                            finishedAt: Date.now(),
                            source: series.source,
                            reason: 'non-persistable-source'
                        });
                    }
                } catch (error) {
                    chartFailureCount += 1;
                    console.warn(`${AUTO_REFRESH_LOG_PREFIX} chart refresh failed for ${coinId}/${range}:`, error);
                }
            }
        } catch (error) {
            coinFailureCount += 1;
            console.warn(`${AUTO_REFRESH_LOG_PREFIX} coin refresh failed for ${coinId}:`, error);
        }
    }

    console.info(`${AUTO_REFRESH_LOG_PREFIX} tracked coin refresh finished`, {
        startedAt,
        finishedAt: Date.now(),
        sweepCoinCount: coinIds.length,
        coinSuccessCount,
        coinFailureCount,
        chartSuccessCount,
        chartFailureCount
    });
}

async function runAutoRefresh(): Promise<void> {
    if (autoRefreshRunning) {
        pushAutoRefreshEvent({
            ts: Date.now(),
            type: 'cycle-skipped',
            detail: { reason: 'already-running' }
        });
        console.info(`${AUTO_REFRESH_LOG_PREFIX} refresh cycle skipped`, {
            reason: 'already-running',
            ts: Date.now()
        });
        return;
    }

    autoRefreshRunning = true;
    autoRefreshStatus.running = true;
    const startedAt = Date.now();
    autoRefreshStatus.cycleCount += 1;
    autoRefreshStatus.lastCycleStartedAt = startedAt;
    autoRefreshStatus.lastCycleFinishedAt = null;
    autoRefreshStatus.lastCycleOk = null;
    autoRefreshStatus.lastCycleError = null;
    autoRefreshStatus.nextCycleAt = startedAt + AUTO_REFRESH_INTERVAL_MS;
    pushAutoRefreshEvent({
        ts: startedAt,
        type: 'cycle-start',
        detail: { cycleCount: autoRefreshStatus.cycleCount }
    });
    console.info(`${AUTO_REFRESH_LOG_PREFIX} refresh cycle start`, {
        startedAt
    });

    try {
        const marketCoins = await refreshMarketsFromUpstream(fetch);
        await refreshTrackedCoinData(fetch, marketCoins.map((coin) => coin.id));
        autoRefreshStatus.lastCycleOk = true;
        pushAutoRefreshEvent({
            ts: Date.now(),
            type: 'cycle-success',
            detail: {
                cycleCount: autoRefreshStatus.cycleCount,
                sweepCoinCount: autoRefreshStatus.lastSweepCoinCount
            }
        });
        console.info(`${AUTO_REFRESH_LOG_PREFIX} refresh cycle success`, {
            startedAt,
            finishedAt: Date.now()
        });
    } catch (error) {
        autoRefreshStatus.lastCycleOk = false;
        autoRefreshStatus.lastCycleError = error instanceof Error ? error.message : String(error);
        pushAutoRefreshEvent({
            ts: Date.now(),
            type: 'cycle-failed',
            detail: {
                cycleCount: autoRefreshStatus.cycleCount,
                error: autoRefreshStatus.lastCycleError
            }
        });
        console.warn(`${AUTO_REFRESH_LOG_PREFIX} refresh cycle failed:`, error);
    } finally {
        autoRefreshRunning = false;
        autoRefreshStatus.running = false;
        autoRefreshStatus.lastCycleFinishedAt = Date.now();
    }
}

export function ensureAutoRefreshStarted(): void {
    if (autoRefreshStarted) {
        console.info(`${AUTO_REFRESH_LOG_PREFIX} ensureAutoRefreshStarted noop`, {
            reason: 'already-started',
            ts: Date.now()
        });
        return;
    }

    autoRefreshStarted = true;
    autoRefreshStatus.schedulerStarted = true;
    autoRefreshStatus.nextCycleAt = Date.now() + AUTO_REFRESH_INTERVAL_MS;
    pushAutoRefreshEvent({
        ts: Date.now(),
        type: 'scheduler-started',
        detail: {
            intervalMs: AUTO_REFRESH_INTERVAL_MS
        }
    });
    console.info(`${AUTO_REFRESH_LOG_PREFIX} auto-refresh scheduler started`, {
        intervalMs: AUTO_REFRESH_INTERVAL_MS,
        ts: Date.now()
    });

    autoRefreshTimer = setInterval(() => {
        void runAutoRefresh();
    }, AUTO_REFRESH_INTERVAL_MS);

    if (typeof autoRefreshTimer.unref === 'function') {
        autoRefreshTimer.unref();
    }

    void runAutoRefresh();
}

export async function refreshCoinNow(fetchFn: typeof fetch, coinId: string): Promise<void> {
    const startedAt = Date.now();
    pushAutoRefreshEvent({
        ts: startedAt,
        type: 'ad-hoc-coin-start',
        detail: { coinId }
    });
    autoRefreshStatus.lastAdHocCoin = {
        coinId,
        startedAt,
        finishedAt: null,
        ok: null,
        error: null
    };
    console.info(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc coin refresh start`, {
        coinId,
        startedAt
    });

    try {
        const breakdown = await getCoinBreakdown(fetchFn, coinId);
        await writeCoinBreakdownSnapshot(coinId, breakdown);

        let chartSuccessCount = 0;
        let chartFailureCount = 0;

        for (const range of CHART_RANGES) {
            try {
                const series = await getCoinChartSeries(fetchFn, coinId, range);
                if (series.source === 'coingecko' || series.source === 'cryptocompare') {
                    await writeCoinChartSnapshot(coinId, range, series);
                    chartSuccessCount += 1;
                } else {
                    console.warn(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc chart refresh skipped`, {
                        coinId,
                        range,
                        source: series.source,
                        reason: 'non-persistable-source'
                    });
                }
            } catch (error) {
                chartFailureCount += 1;
                console.warn(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc chart refresh failed for ${coinId}/${range}:`, error);
            }
        }

        console.info(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc coin refresh success`, {
            coinId,
            startedAt,
            finishedAt: Date.now(),
            breakdownSource: breakdown.source,
            chartSuccessCount,
            chartFailureCount
        });
        autoRefreshStatus.lastAdHocCoin = {
            coinId,
            startedAt,
            finishedAt: Date.now(),
            ok: true,
            error: null
        };
        pushAutoRefreshEvent({
            ts: Date.now(),
            type: 'ad-hoc-coin-success',
            detail: {
                coinId,
                chartSuccessCount,
                chartFailureCount
            }
        });
    } catch (error) {
        console.warn(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc coin refresh failed for ${coinId}:`, error);
        autoRefreshStatus.lastAdHocCoin = {
            coinId,
            startedAt,
            finishedAt: Date.now(),
            ok: false,
            error: error instanceof Error ? error.message : String(error)
        };
        pushAutoRefreshEvent({
            ts: Date.now(),
            type: 'ad-hoc-coin-failed',
            detail: {
                coinId,
                error: error instanceof Error ? error.message : String(error)
            }
        });
    }
}

export async function refreshMarketsNow(fetchFn: typeof fetch): Promise<void> {
    const startedAt = Date.now();
    console.info(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc markets refresh start`, {
        startedAt
    });

    try {
        await refreshMarketsFromUpstream(fetchFn);
        console.info(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc markets refresh success`, {
            startedAt,
            finishedAt: Date.now()
        });
    } catch (error) {
        console.warn(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc markets refresh failed:`, error);
    }
}
