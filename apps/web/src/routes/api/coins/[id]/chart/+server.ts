import { json } from '@sveltejs/kit';

import { ensureAutoRefreshStarted, refreshCoinNow } from '../../../../../lib/server/autoRefreshService';
import type { CoinChartRange } from '../../../../../lib/server/coingecko';
import {
    readCoinChartSnapshot,
} from '../../../../../lib/server/persistentCoinSnapshot';

const VALID_RANGES: CoinChartRange[] = ['24h', '7d', '1m', '3m', 'ytd', '1y', 'max'];

const CHART_STALE_MS: Record<CoinChartRange, number> = {
    '24h': 3 * 60_000,
    '7d': 10 * 60_000,
    '1m': 30 * 60_000,
    '3m': 60 * 60_000,
    ytd: 3 * 60 * 60_000,
    '1y': 3 * 60 * 60_000,
    max: 12 * 60 * 60_000
};

function isCoinChartRange(value: string): value is CoinChartRange {
    return VALID_RANGES.includes(value as CoinChartRange);
}

export async function GET({ fetch, params, url }) {
    ensureAutoRefreshStarted();

    const coinId = params.id;
    const rangeParam = url.searchParams.get('range') ?? '7d';

    if (!coinId) {
        return json({ error: 'Missing coin id.' }, { status: 400 });
    }

    if (!isCoinChartRange(rangeParam)) {
        return json({ error: `Invalid range '${rangeParam}'.` }, { status: 400 });
    }

    const persisted = await readCoinChartSnapshot(coinId, rangeParam);
    const persistedAgeMs = persisted ? Date.now() - persisted.ts : null;
    const persistedIsFallback = persisted ? persisted.value.source !== 'coingecko' : false;

    if (persisted && !persistedIsFallback && persistedAgeMs !== null && persistedAgeMs <= CHART_STALE_MS[rangeParam]) {
        return json({
            range: rangeParam,
            prices: persisted.value.prices,
            volumes: persisted.value.volumes,
            timestamps: persisted.value.timestamps,
            source: 'db-cache',
            stale: false,
            origin: persisted.value.source,
            snapshotTs: persisted.ts
        });
    }

    void refreshCoinNow(fetch, coinId);

    return json(
        {
            error: `No persisted '${rangeParam}' chart snapshot available for '${coinId}' yet. Auto-refresh will populate DB when upstream succeeds.`
        },
        { status: 503 }
    );
}
