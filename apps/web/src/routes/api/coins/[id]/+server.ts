import { json } from '@sveltejs/kit';

import { ensureAutoRefreshStarted, refreshCoinNow } from '../../../../lib/server/autoRefreshService';
import {
    readCoinBreakdownSnapshot,
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

    void refreshCoinNow(fetch, coinId);

    return json(
        {
            error: `No persisted coin breakdown available for '${coinId}' yet. Auto-refresh will populate DB when upstream succeeds.`
        },
        { status: 503 }
    );
}
