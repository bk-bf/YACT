import { json } from '@sveltejs/kit';

import {
    ensureAutoRefreshStarted,
    getAutoRefreshStatus,
    refreshCoinNow
} from '../../../../../lib/server/autoRefreshService';
import type { CoinChartRange } from '../../../../../lib/server/coingecko';
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
const CHART_ROUTE_DEBUG_PREFIX = '[chart-route-debug]';
const RANGE_DURATION_HOURS: Record<CoinChartRange, number> = {
    '24h': 24,
    '7d': 24 * 7,
    '1m': 24 * 30,
    '3m': 24 * 90,
    ytd: 24 * 365,
    '1y': 24 * 365,
    max: 24 * 365 * 4
};

const DERIVATION_PRIORITY: Record<CoinChartRange, CoinChartRange[]> = {
    '24h': ['7d', '1m', '3m', 'ytd', '1y', 'max'],
    '7d': ['1m', '3m', 'ytd', '1y', 'max', '24h'],
    '1m': ['3m', 'ytd', '1y', 'max', '7d', '24h'],
    '3m': ['ytd', '1y', 'max', '1m', '7d'],
    ytd: ['1y', 'max', '3m', '1m'],
    '1y': ['max', 'ytd', '3m', '1m'],
    max: ['1y', 'ytd', '3m', '1m', '7d']
};

function isCoinChartRange(value: string): value is CoinChartRange {
    return VALID_RANGES.includes(value as CoinChartRange);
}

function deriveSeriesForRange(
    targetRange: CoinChartRange,
    sourceSeries: { prices: number[]; volumes: number[] }
): { prices: number[]; volumes: number[]; timestamps: number[] } {
    const sourcePrices = sourceSeries.prices;
    const sourceVolumes = sourceSeries.volumes;
    const targetPoints = Math.max(2, sourcePrices.length);

    const prices = Array.from({ length: targetPoints }, (_, index) => {
        const ratio = targetPoints > 1 ? index / (targetPoints - 1) : 0;
        const sourceIndex = Math.round(ratio * (sourcePrices.length - 1));
        return sourcePrices[Math.min(sourcePrices.length - 1, Math.max(0, sourceIndex))];
    });

    const volumes = Array.from({ length: targetPoints }, (_, index) => {
        const ratio = targetPoints > 1 ? index / (targetPoints - 1) : 0;
        const sourceIndex = Math.round(ratio * (sourceVolumes.length - 1));
        return sourceVolumes[Math.min(sourceVolumes.length - 1, Math.max(0, sourceIndex))] ?? sourceVolumes[sourceVolumes.length - 1] ?? 0;
    });

    const now = Date.now();
    const spanMs = RANGE_DURATION_HOURS[targetRange] * 3600 * 1000;
    const start = now - spanMs;
    const step = targetPoints > 1 ? spanMs / (targetPoints - 1) : 0;
    const timestamps = Array.from({ length: targetPoints }, (_, index) => Math.round(start + index * step));

    return { prices, volumes, timestamps };
}

export async function GET({ fetch, params, url }) {
    ensureAutoRefreshStarted();

    const coinId = params.id;
    const rangeParam = url.searchParams.get('range') ?? '7d';

    if (!coinId) {
        return json({ error: 'Missing coin id.', autoRefresh: getAutoRefreshStatus() }, { status: 400 });
    }

    if (!isCoinChartRange(rangeParam)) {
        return json({ error: `Invalid range '${rangeParam}'.`, autoRefresh: getAutoRefreshStatus() }, { status: 400 });
    }

    const persisted = await readCoinChartSnapshot(coinId, rangeParam);
    const persistedAgeMs = persisted ? Date.now() - persisted.ts : null;
    const persistedIsFallback = persisted
        ? persisted.value.source === 'coingecko-cache' || persisted.value.source === 'db-derived'
        : false;

    if (persisted) {
        const ts = persisted.value.timestamps;
        const spanHours = ts.length > 1
            ? Math.floor((ts[ts.length - 1] - ts[0]) / (1000 * 60 * 60))
            : 0;
        console.info(`${CHART_ROUTE_DEBUG_PREFIX} persisted snapshot`, {
            coinId,
            range: rangeParam,
            source: persisted.value.source,
            prices: persisted.value.prices.length,
            timestamps: ts.length,
            spanHours,
            ageMs: persistedAgeMs
        });
    } else {
        console.warn(`${CHART_ROUTE_DEBUG_PREFIX} no persisted snapshot`, {
            coinId,
            range: rangeParam
        });
    }

    if (persisted && !persistedIsFallback && persistedAgeMs !== null && persistedAgeMs <= CHART_STALE_MS[rangeParam]) {
        return json({
            range: rangeParam,
            prices: persisted.value.prices,
            volumes: persisted.value.volumes,
            timestamps: persisted.value.timestamps,
            source: 'db-cache',
            stale: false,
            origin: persisted.value.source,
            snapshotTs: persisted.ts,
            autoRefresh: getAutoRefreshStatus()
        });
    }

    if (!persisted) {
        for (const candidateRange of DERIVATION_PRIORITY[rangeParam]) {
            const candidate = await readCoinChartSnapshot(coinId, candidateRange);
            if (!candidate || candidate.value.prices.length < 2) {
                continue;
            }

            const derived = deriveSeriesForRange(rangeParam, {
                prices: candidate.value.prices,
                volumes: candidate.value.volumes
            });

            await writeCoinChartSnapshot(coinId, rangeParam, {
                ...derived,
                source: 'db-derived'
            });

            console.info(`${CHART_ROUTE_DEBUG_PREFIX} derived snapshot created`, {
                coinId,
                range: rangeParam,
                fromRange: candidateRange,
                points: derived.prices.length
            });

            return json({
                range: rangeParam,
                prices: derived.prices,
                volumes: derived.volumes,
                timestamps: derived.timestamps,
                source: 'db-cache',
                stale: true,
                origin: 'db-derived',
                warning: `Range '${rangeParam}' was derived from '${candidateRange}' while awaiting upstream refresh.`,
                autoRefresh: getAutoRefreshStatus()
            });
        }
    }

    void refreshCoinNow(fetch, coinId);

    return json(
        {
            error: `No persisted '${rangeParam}' chart snapshot available for '${coinId}' yet. Auto-refresh will populate DB when upstream succeeds.`,
            autoRefresh: getAutoRefreshStatus()
        },
        { status: 503 }
    );
}
