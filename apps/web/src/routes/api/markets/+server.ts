import { json } from '@sveltejs/kit';

import {
    getCachedGasGwei,
    getFallbackGlobalMarketSummary,
    getGlobalMarketSummary,
    getLatestGasGwei,
    getTopGainers,
    getTrendingByVolume,
    getTopMarketCoins
} from '../../../lib/server/coingecko';
import { getFallbackCryptoHeadlines, getTopCryptoHeadlines } from '../../../lib/server/headlines';
import { ensureAutoRefreshStarted, refreshMarketsNow } from '../../../lib/server/autoRefreshService';
import {
    readPersistentMarketSnapshot,
    writePersistentMarketSnapshot
} from '../../../lib/server/persistentMarketSnapshot';

async function persistSnapshotSafely(
    source: string,
    coins: Awaited<ReturnType<typeof getTopMarketCoins>>,
    global: Awaited<ReturnType<typeof getGlobalMarketSummary>>
): Promise<void> {
    try {
        await writePersistentMarketSnapshot(source, coins, global);
    } catch (error) {
        console.error('Failed to persist market snapshot:', error);
    }
}

export async function GET({ fetch }) {
    ensureAutoRefreshStarted();

    const headlinesPromise = getTopCryptoHeadlines(fetch, 5).catch(() => getFallbackCryptoHeadlines());
    const gasPromise = getLatestGasGwei().catch(() => getCachedGasGwei());
    const [persistentSnapshot, headlines, gasGwei] = await Promise.all([
        readPersistentMarketSnapshot(),
        headlinesPromise,
        gasPromise
    ]);

    if (persistentSnapshot) {
        // Serve DB snapshot immediately and refresh upstream asynchronously.
        void refreshMarketsNow(fetch);

        const dbGlobalResolved = {
            ...persistentSnapshot.global,
            gasGwei: gasGwei ?? persistentSnapshot.global.gasGwei
        };

        const ageMs = Date.now() - persistentSnapshot.ts;
        return json({
            source: 'db-cache',
            count: persistentSnapshot.count,
            coins: persistentSnapshot.coins,
            global: dbGlobalResolved,
            headlines,
            highlights: {
                trending: getTrendingByVolume(persistentSnapshot.coins, 3),
                topGainers: getTopGainers(persistentSnapshot.coins, 3)
            },
            stale: ageMs > 5 * 60_000,
            snapshotTs: persistentSnapshot.ts
        });
    }

    // Bootstrap path: if DB is empty, fetch once and seed it.
    try {
        const coins = await getTopMarketCoins(fetch);
        const global = await getGlobalMarketSummary(fetch, coins);
        const globalResolved = {
            ...global,
            gasGwei: gasGwei ?? global.gasGwei
        };

        await persistSnapshotSafely('coingecko-bootstrap', coins, globalResolved);

        return json({
            source: 'coingecko-bootstrap',
            count: coins.length,
            coins,
            global: globalResolved,
            headlines,
            highlights: {
                trending: getTrendingByVolume(coins, 3),
                topGainers: getTopGainers(coins, 3)
            },
            stale: false
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json(
            {
                source: 'db-unavailable',
                count: 0,
                coins: [],
                global: getFallbackGlobalMarketSummary([]),
                headlines,
                highlights: {
                    trending: [],
                    topGainers: []
                },
                stale: true,
                error: message
            },
            { status: 503 }
        );
    }
}
