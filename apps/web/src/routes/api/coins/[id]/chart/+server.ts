import { json } from '@sveltejs/kit';

import { ensureAutoRefreshStarted, refreshCoinNow } from '../../../../../lib/server/autoRefreshService';
import { getCoinChartSeries, type CoinChartRange } from '../../../../../lib/server/coingecko';
import {
    readCoinChartSnapshot,
    writeCoinChartSnapshot
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
    if (persisted) {
        const ageMs = Date.now() - persisted.ts;
        if (ageMs > CHART_STALE_MS[rangeParam]) {
            void refreshCoinNow(fetch, coinId);
        }

        return json({
            range: rangeParam,
            prices: persisted.value.prices,
            volumes: persisted.value.volumes,
            timestamps: persisted.value.timestamps,
            source: 'db-cache',
            stale: ageMs > CHART_STALE_MS[rangeParam],
            snapshotTs: persisted.ts
        });
    }

    try {
        const series = await getCoinChartSeries(fetch, coinId, rangeParam);
        await writeCoinChartSnapshot(coinId, rangeParam, series);

        return json({
            range: rangeParam,
            prices: series.prices,
            volumes: series.volumes,
            timestamps: series.timestamps,
            source: series.source,
            stale: series.source !== 'coingecko'
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message }, { status: 502 });
    }
}
