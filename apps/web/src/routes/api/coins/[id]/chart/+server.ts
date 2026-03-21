import { json } from '@sveltejs/kit';

type CoinChartRange = '24h' | '7d' | '1m' | '3m' | 'ytd' | '1y' | 'max';

const VALID_RANGES: CoinChartRange[] = ['24h', '7d', '1m', '3m', 'ytd', '1y', 'max'];

const ANALYTICS_BASE_URL = process.env.YACT_ANALYTICS_URL || 'http://localhost:8000';

// The server stores chart timeframes under different keys than the frontend range IDs.
const SERVER_CHART_KEY: Record<CoinChartRange, string> = {
    '24h': '24h',
    '7d': '7d',
    '1m': '30d',
    '3m': '3m',
    'ytd': 'YTD',
    '1y': '1y',
    'max': 'MAX',
};

function isCoinChartRange(value: string): value is CoinChartRange {
    return VALID_RANGES.includes(value as CoinChartRange);
}

// Server stores chart series as [[timestamp, value], ...] tuples.
// Extract a flat price/volume array and a parallel timestamps array.
function extractSeries(tuples: unknown): { values: number[]; timestamps: number[] } {
    if (!Array.isArray(tuples) || tuples.length === 0) {
        return { values: [], timestamps: [] };
    }
    if (Array.isArray(tuples[0])) {
        // [[ts, value], ...] — standard server format
        const pairs = tuples as [number, number][];
        return {
            values: pairs.map(([, v]) => v).filter((v) => Number.isFinite(v)),
            timestamps: pairs.map(([ts]) => ts).filter((ts) => Number.isFinite(ts)),
        };
    }
    // Already flat (shouldn't occur with current server, but handle gracefully)
    return {
        values: (tuples as unknown[]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
        timestamps: [],
    };
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

    const response = await fetch(`${ANALYTICS_BASE_URL}/api/v1/coins/${encodeURIComponent(coinId)}`, {
        headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
        const detail = await response.text();
        return json({
            error: `coin upstream failed: HTTP ${response.status}`,
            detail
        }, { status: response.status === 404 ? 404 : 503 });
    }

    const payload = await response.json();
    const serverKey = SERVER_CHART_KEY[rangeParam as CoinChartRange];
    const chart = payload?.coins?.[coinId]?.charts?.[serverKey];
    if (!chart?.value) {
        return json({
            error: `No '${rangeParam}' chart available for '${coinId}' in analytics API.`
        }, { status: 404 });
    }

    const { values: prices, timestamps } = extractSeries(chart.value.prices);
    // Server stores trading volumes as 'totalVolumes'; fall back to 'volumes' for forwards compat.
    const { values: volumes } = extractSeries(chart.value.totalVolumes ?? chart.value.volumes ?? []);

    return json({
        range: rangeParam,
        prices,
        volumes,
        timestamps,
        source: 'analytics-api',
        stale: false,
        origin: chart.value.source,
        snapshotTs: chart.ts
    });
}
