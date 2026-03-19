import {
    getCoinBreakdown,
    getCoinChartSeries,
    getGlobalMarketSummary,
    getTopMarketCoins,
    type CoinChartRange
} from './coingecko';
import { listTrackedCoinIds, writeCoinBreakdownSnapshot, writeCoinChartSnapshot } from './persistentCoinSnapshot';
import { writePersistentMarketSnapshot } from './persistentMarketSnapshot';

const AUTO_REFRESH_INTERVAL_MS = 5 * 60_000;
const AUTO_REFRESH_LOG_PREFIX = '[auto-refresh]';
const CHART_RANGES: CoinChartRange[] = ['24h', '7d', '1m', '3m', 'ytd', '1y', 'max'];

let autoRefreshStarted = false;
let autoRefreshTimer: NodeJS.Timeout | null = null;
let autoRefreshRunning = false;

async function refreshMarketsFromUpstream(fetchFn: typeof fetch): Promise<void> {
    const coins = await getTopMarketCoins(fetchFn);
    const global = await getGlobalMarketSummary(fetchFn, coins);
    await writePersistentMarketSnapshot('coingecko-auto-refresh', coins, global);
}

export async function refreshTrackedCoinData(fetchFn: typeof fetch): Promise<void> {
    const coinIds = await listTrackedCoinIds();
    if (!coinIds.length) {
        return;
    }

    // Refresh tracked coins sequentially to reduce upstream burst pressure.
    for (const coinId of coinIds) {
        try {
            const breakdown = await getCoinBreakdown(fetchFn, coinId);
            await writeCoinBreakdownSnapshot(coinId, breakdown);

            for (const range of CHART_RANGES) {
                try {
                    const series = await getCoinChartSeries(fetchFn, coinId, range);
                    if (series.source === 'coingecko') {
                        await writeCoinChartSnapshot(coinId, range, series);
                    }
                } catch (error) {
                    console.warn(`${AUTO_REFRESH_LOG_PREFIX} chart refresh failed for ${coinId}/${range}:`, error);
                }
            }
        } catch (error) {
            console.warn(`${AUTO_REFRESH_LOG_PREFIX} coin refresh failed for ${coinId}:`, error);
        }
    }
}

async function runAutoRefresh(): Promise<void> {
    if (autoRefreshRunning) {
        return;
    }

    autoRefreshRunning = true;
    try {
        await refreshMarketsFromUpstream(fetch);
        await refreshTrackedCoinData(fetch);
    } catch (error) {
        console.warn(`${AUTO_REFRESH_LOG_PREFIX} refresh cycle failed:`, error);
    } finally {
        autoRefreshRunning = false;
    }
}

export function ensureAutoRefreshStarted(): void {
    if (autoRefreshStarted) {
        return;
    }

    autoRefreshStarted = true;
    autoRefreshTimer = setInterval(() => {
        void runAutoRefresh();
    }, AUTO_REFRESH_INTERVAL_MS);

    if (typeof autoRefreshTimer.unref === 'function') {
        autoRefreshTimer.unref();
    }

    void runAutoRefresh();
}

export async function refreshCoinNow(fetchFn: typeof fetch, coinId: string): Promise<void> {
    try {
        const breakdown = await getCoinBreakdown(fetchFn, coinId);
        await writeCoinBreakdownSnapshot(coinId, breakdown);

        for (const range of CHART_RANGES) {
            try {
                const series = await getCoinChartSeries(fetchFn, coinId, range);
                if (series.source === 'coingecko') {
                    await writeCoinChartSnapshot(coinId, range, series);
                }
            } catch (error) {
                console.warn(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc chart refresh failed for ${coinId}/${range}:`, error);
            }
        }
    } catch (error) {
        console.warn(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc coin refresh failed for ${coinId}:`, error);
    }
}

export async function refreshMarketsNow(fetchFn: typeof fetch): Promise<void> {
    try {
        await refreshMarketsFromUpstream(fetchFn);
    } catch (error) {
        console.warn(`${AUTO_REFRESH_LOG_PREFIX} ad-hoc markets refresh failed:`, error);
    }
}
