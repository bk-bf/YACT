import { json } from '@sveltejs/kit';

import { ensureAutoRefreshStarted, refreshCoinNow } from '../../../../lib/server/autoRefreshService';
import { getCoinBreakdown } from '../../../../lib/server/coingecko';
import {
    readCoinBreakdownSnapshot,
    writeCoinBreakdownSnapshot
} from '../../../../lib/server/persistentCoinSnapshot';

const BREAKDOWN_STALE_MS = 10 * 60_000;

export async function GET({ fetch, params }) {
    ensureAutoRefreshStarted();

    const coinId = params.id;

    if (!coinId) {
        return json({ error: 'Missing coin id.' }, { status: 400 });
    }

    const persisted = await readCoinBreakdownSnapshot(coinId);
    if (persisted) {
        const ageMs = Date.now() - persisted.ts;
        if (ageMs > BREAKDOWN_STALE_MS) {
            void refreshCoinNow(fetch, coinId);
        }

        return json({
            coin: persisted.value,
            stale: ageMs > BREAKDOWN_STALE_MS,
            source: 'db-cache',
            snapshotTs: persisted.ts
        });
    }

    try {
        const coin = await getCoinBreakdown(fetch, coinId);
        await writeCoinBreakdownSnapshot(coinId, coin);

        return json({
            coin,
            stale: coin.source !== 'coingecko'
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const isNotFound = message.includes('status 404');

        return json(
            {
                error: isNotFound ? `Coin '${coinId}' was not found.` : message
            },
            { status: isNotFound ? 404 : 502 }
        );
    }
}
