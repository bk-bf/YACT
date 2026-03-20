import { dev } from '$app/environment';

import type { CryptoHeadline } from './headlines';
import { persistHeadlinesSnapshot as persistToDatabase } from './persistentDatabaseWrite';

const SNAPSHOT_VERSION = 1;
const SNAPSHOT_LOG_PREFIX = '[headlines-snapshot]';
const ANALYTICS_BASE_URL = dev
    ? process.env.YACT_ANALYTICS_URL || 'http://localhost:8000'
    : process.env.YACT_ANALYTICS_URL || 'https://analytics.yact.local';

interface PersistentHeadlinesSnapshot {
    v: number;
    ts: number;
    source: string;
    headlines: CryptoHeadline[];
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isValidHeadline(value: unknown): value is CryptoHeadline {
    if (!isObject(value)) {
        return false;
    }

    return (
        typeof value.id === 'string' &&
        typeof value.title === 'string' &&
        typeof value.url === 'string' &&
        typeof value.source === 'string' &&
        typeof value.publishedAt === 'string'
    );
}

function isValidSnapshot(value: unknown): value is PersistentHeadlinesSnapshot {
    if (!isObject(value)) {
        return false;
    }

    return (
        value.v === SNAPSHOT_VERSION &&
        typeof value.ts === 'number' &&
        typeof value.source === 'string' &&
        Array.isArray(value.headlines) &&
        value.headlines.every(isValidHeadline)
    );
}

function normalizeSnapshotLike(value: unknown): PersistentHeadlinesSnapshot | null {
    if (!isObject(value) || !Array.isArray(value.headlines)) {
        return null;
    }

    const headlines = value.headlines.filter(isValidHeadline);
    if (!headlines.length) {
        return null;
    }

    return {
        v: SNAPSHOT_VERSION,
        ts: typeof value.ts === 'number' ? value.ts : Date.now(),
        source: typeof value.source === 'string' ? value.source : 'unknown',
        headlines
    };
}

async function readSnapshotFromApi(): Promise<PersistentHeadlinesSnapshot | null> {
    try {
        const response = await fetch(`${ANALYTICS_BASE_URL}/api/v1/headlines`, {
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
        console.error(`${SNAPSHOT_LOG_PREFIX} failed to read API headlines:`, error);
        return null;
    }
}

export async function readPersistentHeadlinesSnapshot(): Promise<PersistentHeadlinesSnapshot | null> {
    return readSnapshotFromApi();
}

export async function writePersistentHeadlinesSnapshot(source: string, headlines: CryptoHeadline[]): Promise<void> {
    if (!headlines.length) {
        return;
    }

    const snapshot: PersistentHeadlinesSnapshot = {
        v: SNAPSHOT_VERSION,
        ts: Date.now(),
        source,
        headlines
    };

    const result = await persistToDatabase(snapshot);
    if (!result.success) {
        throw new Error(result.error ?? 'unknown error');
    }

    console.info(`${SNAPSHOT_LOG_PREFIX} wrote headlines snapshot to API (count=${headlines.length})`);
}
