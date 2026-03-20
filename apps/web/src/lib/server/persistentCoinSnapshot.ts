import { dev } from '$app/environment';

import type { CoinBreakdown, CoinChartRange, CoinChartSeries } from './coingecko';
import { persistCoinSnapshot as persistToDatabase } from './persistentDatabaseWrite';

const SNAPSHOT_LOG_PREFIX = '[coin-snapshot]';
const ANALYTICS_BASE_URL = dev
    ? process.env.YACT_ANALYTICS_URL || 'http://localhost:8000'
    : process.env.YACT_ANALYTICS_URL || 'https://analytics.yact.local';

interface StoredCoinBreakdown {
    ts: number;
    value: CoinBreakdown;
}

interface StoredCoinChartSeries {
    ts: number;
    value: CoinChartSeries;
}

interface StoredCoinEntry {
    breakdown?: StoredCoinBreakdown;
    charts?: Partial<Record<CoinChartRange, StoredCoinChartSeries>>;
}

interface PersistentCoinSnapshot {
    v: number;
    updatedAt: number;
    coins: Record<string, StoredCoinEntry>;
}

export interface PersistedCoinBreakdown {
    ts: number;
    value: CoinBreakdown;
}

export interface PersistedCoinChartSeries {
    ts: number;
    value: CoinChartSeries;
}

function normalizeCoinBreakdown(value: CoinBreakdown): CoinBreakdown {
    const whitepaper = typeof value.whitepaper === 'string' && value.whitepaper.trim().length > 0
        ? value.whitepaper
        : null;

    return {
        ...value,
        apiId: value.apiId || value.id,
        whitepaper,
        websites: Array.isArray(value.websites) ? value.websites : [],
        explorers: Array.isArray(value.explorers) ? value.explorers : [],
        community: Array.isArray(value.community) ? value.community : [],
        contracts: Array.isArray(value.contracts) ? value.contracts : [],
        chains: Array.isArray(value.chains) ? value.chains : []
    };
}

async function readCoinSnapshotFromApi(coinId: string): Promise<PersistentCoinSnapshot | null> {
    try {
        const response = await fetch(`${ANALYTICS_BASE_URL}/api/v1/coins/${coinId}`, {
            headers: { Accept: 'application/json' }
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            console.warn(`${SNAPSHOT_LOG_PREFIX} failed API read for ${coinId}: HTTP ${response.status}`);
            return null;
        }

        return (await response.json()) as PersistentCoinSnapshot;
    } catch (error) {
        console.error(`${SNAPSHOT_LOG_PREFIX} failed API read for ${coinId}:`, error);
        return null;
    }
}

async function writeCoinSnapshotToApi(snapshot: PersistentCoinSnapshot): Promise<void> {
    const result = await persistToDatabase(snapshot);
    if (!result.success) {
        throw new Error(result.error ?? 'unknown error');
    }
}

export async function readCoinBreakdownSnapshot(coinId: string): Promise<PersistedCoinBreakdown | null> {
    const snapshot = await readCoinSnapshotFromApi(coinId);
    const breakdown = snapshot?.coins?.[coinId]?.breakdown;
    if (!breakdown) {
        return null;
    }

    return {
        ts: breakdown.ts,
        value: normalizeCoinBreakdown(breakdown.value)
    };
}

export async function writeCoinBreakdownSnapshot(coinId: string, breakdown: CoinBreakdown): Promise<void> {
    const now = Date.now();
    const snapshot: PersistentCoinSnapshot = {
        v: 1,
        updatedAt: now,
        coins: {
            [coinId]: {
                breakdown: {
                    ts: now,
                    value: normalizeCoinBreakdown(breakdown)
                }
            }
        }
    };

    await writeCoinSnapshotToApi(snapshot);
}

export async function readCoinChartSnapshot(
    coinId: string,
    range: CoinChartRange
): Promise<PersistedCoinChartSeries | null> {
    const snapshot = await readCoinSnapshotFromApi(coinId);
    const chart = snapshot?.coins?.[coinId]?.charts?.[range];
    return chart ?? null;
}

export async function writeCoinChartSnapshot(
    coinId: string,
    range: CoinChartRange,
    series: CoinChartSeries
): Promise<void> {
    const current = await readCoinSnapshotFromApi(coinId);
    const currentEntry = current?.coins?.[coinId];
    const currentBreakdown = currentEntry?.breakdown;

    if (!currentBreakdown) {
        throw new Error(`${SNAPSHOT_LOG_PREFIX} cannot write chart for ${coinId}/${range}: missing persisted breakdown`);
    }

    const now = Date.now();
    const snapshot: PersistentCoinSnapshot = {
        v: 1,
        updatedAt: now,
        coins: {
            [coinId]: {
                breakdown: {
                    ts: currentBreakdown.ts,
                    value: normalizeCoinBreakdown(currentBreakdown.value)
                },
                charts: {
                    [range]: {
                        ts: now,
                        value: series
                    }
                }
            }
        }
    };

    await writeCoinSnapshotToApi(snapshot);
}

export async function listTrackedCoinIds(): Promise<string[]> {
    try {
        const response = await fetch(`${ANALYTICS_BASE_URL}/api/v1/markets`, {
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
            return [];
        }

        const payload = await response.json() as { coins?: Array<{ id?: string }> };
        return (payload.coins ?? [])
            .map((coin) => coin.id)
            .filter((coinId): coinId is string => typeof coinId === 'string' && coinId.length > 0);
    } catch {
        return [];
    }
}

export async function readCoinLatestSnapshotTs(coinId: string): Promise<number | null> {
    const snapshot = await readCoinSnapshotFromApi(coinId);
    const entry = snapshot?.coins?.[coinId];
    if (!entry) {
        return null;
    }

    let latestTs = entry.breakdown?.ts ?? null;
    for (const chart of Object.values(entry.charts ?? {})) {
        if (!chart) {
            continue;
        }
        latestTs = latestTs === null ? chart.ts : Math.max(latestTs, chart.ts);
    }

    return latestTs;
}
