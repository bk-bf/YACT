import { dev } from '$app/environment';

import type { MarketCoin } from '../types/market';
import type { GlobalMarketSummary } from './coingecko';
import { persistMarketSnapshot as persistToDatabase } from './persistentDatabaseWrite';

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_LOG_PREFIX = '[market-snapshot]';
const ANALYTICS_BASE_URL = dev
    ? process.env.YACT_ANALYTICS_URL || 'http://localhost:8000'
    : process.env.YACT_ANALYTICS_URL || 'https://analytics.yact.local';

export interface PersistentMarketSnapshot {
    v: number;
    ts: number;
    source: string;
    count: number;
    coins: MarketCoin[];
    global: GlobalMarketSummary;
}

function isValidSnapshot(value: unknown): value is PersistentMarketSnapshot {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const snapshot = value as Partial<PersistentMarketSnapshot>;
    return (
        snapshot.v === SNAPSHOT_VERSION &&
        typeof snapshot.ts === 'number' &&
        typeof snapshot.source === 'string' &&
        typeof snapshot.count === 'number' &&
        Array.isArray(snapshot.coins) &&
        snapshot.global !== undefined
    );
}

function normalizeSnapshotLike(value: unknown): PersistentMarketSnapshot | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const snapshot = value as Partial<PersistentMarketSnapshot>;
    if (typeof snapshot.source !== 'string' || typeof snapshot.count !== 'number' || !Array.isArray(snapshot.coins) || snapshot.global === undefined) {
        return null;
    }

    return {
        v: SNAPSHOT_VERSION,
        ts: typeof snapshot.ts === 'number' ? snapshot.ts : Date.now(),
        source: snapshot.source,
        count: snapshot.count,
        coins: snapshot.coins,
        global: snapshot.global
    };
}

async function readSnapshotFromApi(): Promise<PersistentMarketSnapshot | null> {
    try {
        const response = await fetch(`${ANALYTICS_BASE_URL}/api/v1/markets`, {
            headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
            return null;
        }

        const parsed = await response.json();
        if (isValidSnapshot(parsed)) {
            return parsed;
        }

        const migrated = normalizeSnapshotLike(parsed);
        if (migrated) {
            console.warn(`${SNAPSHOT_LOG_PREFIX} migrated snapshot payload from API`);
            return migrated;
        }

        return null;
    } catch (error) {
        console.error(`${SNAPSHOT_LOG_PREFIX} failed to read snapshot from API:`, error);
        return null;
    }
}

export async function readPersistentMarketSnapshot(): Promise<PersistentMarketSnapshot | null> {
    const snapshot = await readSnapshotFromApi();

    if (!snapshot) {
        console.warn(`${SNAPSHOT_LOG_PREFIX} no readable snapshot from API`);
        return null;
    }
    const ageSeconds = Math.max(0, Math.floor((Date.now() - snapshot.ts) / 1000));
    console.info(
        `${SNAPSHOT_LOG_PREFIX} loaded snapshot from API ` +
        `(source=${snapshot.source}, count=${snapshot.count}, age_s=${ageSeconds})`
    );

    return snapshot;
}

export async function writePersistentMarketSnapshot(
    source: string,
    coins: MarketCoin[],
    global: GlobalMarketSummary
): Promise<void> {
    const snapshot: PersistentMarketSnapshot = {
        v: SNAPSHOT_VERSION,
        ts: Date.now(),
        source,
        count: coins.length,
        coins,
        global
    };

    const result = await persistToDatabase(snapshot);
    if (!result.success) {
        throw new Error(result.error ?? 'unknown error');
    }

    console.info(
        `${SNAPSHOT_LOG_PREFIX} wrote snapshot to API ` +
        `(source=${source}, count=${coins.length}, ts=${snapshot.ts})`
    );
}
