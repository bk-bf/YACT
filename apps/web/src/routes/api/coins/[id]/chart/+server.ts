import { json } from '@sveltejs/kit';

import { getCoinChartSeries, type CoinChartRange } from '../../../../../lib/server/coingecko';

const VALID_RANGES: CoinChartRange[] = ['24h', '7d', '1m', '3m', 'ytd', '1y', 'max'];

function isCoinChartRange(value: string): value is CoinChartRange {
    return VALID_RANGES.includes(value as CoinChartRange);
}

export async function GET({ fetch, params, url }) {
    const coinId = params.id;
    const rangeParam = url.searchParams.get('range') ?? '7d';

    if (!coinId) {
        return json({ error: 'Missing coin id.' }, { status: 400 });
    }

    if (!isCoinChartRange(rangeParam)) {
        return json({ error: `Invalid range '${rangeParam}'.` }, { status: 400 });
    }

    try {
        const series = await getCoinChartSeries(fetch, coinId, rangeParam);

        return json({
            range: rangeParam,
            prices: series.prices,
            volumes: series.volumes,
            source: series.source,
            stale: series.source !== 'coingecko'
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return json({ error: message }, { status: 502 });
    }
}
