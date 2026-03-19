import { json } from '@sveltejs/kit';

import { ensureAutoRefreshStarted } from '../../../../lib/server/autoRefreshService';
import { readCoinBreakdownSnapshot } from '../../../../lib/server/persistentCoinSnapshot';
import { readPersistentMarketSnapshot } from '../../../../lib/server/persistentMarketSnapshot';

export async function GET({ url }) {
    ensureAutoRefreshStarted();

    const coinId = url.searchParams.get('coinId');
    const [market, coin] = await Promise.all([
        readPersistentMarketSnapshot(),
        coinId ? readCoinBreakdownSnapshot(coinId) : Promise.resolve(null)
    ]);

    return json({
        marketSnapshotTs: market?.ts ?? null,
        coinSnapshotTs: coin?.ts ?? null,
        coinId: coinId ?? null,
        ts: Date.now()
    });
}
