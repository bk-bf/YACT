import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { CoinBreakdown, CoinChartRange, CoinChartSeries } from './coingecko';

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_DIR = path.join(process.cwd(), '.cache');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'coin-snapshot.json');
const SNAPSHOT_LOG_PREFIX = '[coin-snapshot]';

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

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isValidSnapshot(value: unknown): value is PersistentCoinSnapshot {
    if (!isObject(value)) {
        return false;
    }

    if (value.v !== SNAPSHOT_VERSION || typeof value.updatedAt !== 'number' || !isObject(value.coins)) {
        return false;
    }

    return true;
}

async function readSnapshot(): Promise<PersistentCoinSnapshot> {
    try {
        const raw = await readFile(SNAPSHOT_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (isValidSnapshot(parsed)) {
            return parsed;
        }

        console.warn(`${SNAPSHOT_LOG_PREFIX} invalid snapshot payload, reinitializing store`);
        return {
            v: SNAPSHOT_VERSION,
            updatedAt: Date.now(),
            coins: {}
        };
    } catch (error) {
        if (isObject(error) && error.code === 'ENOENT') {
            return {
                v: SNAPSHOT_VERSION,
                updatedAt: Date.now(),
                coins: {}
            };
        }

        console.error(`${SNAPSHOT_LOG_PREFIX} failed to read snapshot:`, error);
        return {
            v: SNAPSHOT_VERSION,
            updatedAt: Date.now(),
            coins: {}
        };
    }
}

async function writeSnapshot(snapshot: PersistentCoinSnapshot): Promise<void> {
    await mkdir(SNAPSHOT_DIR, { recursive: true });
    await writeFile(SNAPSHOT_FILE, JSON.stringify(snapshot), 'utf-8');
}

export async function readCoinBreakdownSnapshot(coinId: string): Promise<PersistedCoinBreakdown | null> {
    const snapshot = await readSnapshot();
    const entry = snapshot.coins[coinId];
    if (!entry?.breakdown) {
        return null;
    }

    return entry.breakdown;
}

export async function writeCoinBreakdownSnapshot(coinId: string, breakdown: CoinBreakdown): Promise<void> {
    const snapshot = await readSnapshot();
    const existing = snapshot.coins[coinId] ?? {};

    snapshot.coins[coinId] = {
        ...existing,
        breakdown: {
            ts: Date.now(),
            value: breakdown
        }
    };
    snapshot.updatedAt = Date.now();

    try {
        await writeSnapshot(snapshot);
    } catch (error) {
        console.error(`${SNAPSHOT_LOG_PREFIX} failed to write breakdown for ${coinId}:`, error);
        throw error;
    }
}

export async function readCoinChartSnapshot(
    coinId: string,
    range: CoinChartRange
): Promise<PersistedCoinChartSeries | null> {
    const snapshot = await readSnapshot();
    const entry = snapshot.coins[coinId];
    const chart = entry?.charts?.[range];

    return chart ?? null;
}

export async function writeCoinChartSnapshot(
    coinId: string,
    range: CoinChartRange,
    series: CoinChartSeries
): Promise<void> {
    const snapshot = await readSnapshot();
    const existing = snapshot.coins[coinId] ?? {};

    snapshot.coins[coinId] = {
        ...existing,
        charts: {
            ...(existing.charts ?? {}),
            [range]: {
                ts: Date.now(),
                value: series
            }
        }
    };
    snapshot.updatedAt = Date.now();

    try {
        await writeSnapshot(snapshot);
    } catch (error) {
        console.error(`${SNAPSHOT_LOG_PREFIX} failed to write chart for ${coinId}/${range}:`, error);
        throw error;
    }
}

export async function listTrackedCoinIds(): Promise<string[]> {
    const snapshot = await readSnapshot();
    return Object.keys(snapshot.coins);
}
