import { json } from '@sveltejs/kit';

import { ensureAutoRefreshStarted, refreshCoinNow } from '../../../../lib/server/autoRefreshService';
import {
    readCoinBreakdownSnapshot,
    readCoinChartSnapshot,
    writeCoinBreakdownSnapshot,
} from '../../../../lib/server/persistentCoinSnapshot';
import { readPersistentMarketSnapshot } from '../../../../lib/server/persistentMarketSnapshot';
import type { MarketCoin } from '../../../../lib/types/market';

const BREAKDOWN_STALE_MS = 10 * 60_000;

async function deriveAtlFromPersistedCharts(coinId: string): Promise<{ allTimeLow: number; allTimeLowDate: string | null } | null> {
    const ranges = ['max', '1y', 'ytd', '3m', '1m', '7d', '24h'] as const;
    for (const range of ranges) {
        const snapshot = await readCoinChartSnapshot(coinId, range);
        const prices = snapshot?.value.prices ?? [];
        const timestamps = snapshot?.value.timestamps ?? [];

        if (prices.length < 2 || prices.length !== timestamps.length) {
            continue;
        }

        let minPrice = Number.POSITIVE_INFINITY;
        let minTs: number | null = null;
        for (let index = 0; index < prices.length; index += 1) {
            const price = prices[index];
            const ts = timestamps[index];
            if (!Number.isFinite(price) || !Number.isFinite(ts)) {
                continue;
            }

            if (price < minPrice) {
                minPrice = price;
                minTs = ts;
            }
        }

        if (Number.isFinite(minPrice) && minPrice > 0) {
            return {
                allTimeLow: minPrice,
                allTimeLowDate: minTs ? new Date(minTs).toISOString() : null
            };
        }
    }

    return null;
}

function buildDerivedBreakdownFromMarketCoin(coin: MarketCoin) {
    const sparklineTail = coin.sparkline7d.length > 24 ? coin.sparkline7d.slice(-24) : coin.sparkline7d;
    const low24h = sparklineTail.length ? Math.min(...sparklineTail) : coin.currentPrice;
    const high24h = sparklineTail.length ? Math.max(...sparklineTail) : coin.currentPrice;

    const syntheticVolumes = coin.sparkline7d.map((price, index, arr) => {
        if (index === 0) {
            return coin.totalVolume24h / 24;
        }

        const prev = arr[index - 1] || price;
        const relativeMove = Math.abs((price - prev) / (prev || 1));
        return (coin.totalVolume24h / 24) * (1 + relativeMove * 4);
    });

    return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.currentPrice,
        marketCap: coin.marketCap,
        marketCapRank: coin.marketCapRank,
        totalVolume24h: coin.totalVolume24h,
        low24h,
        high24h,
        circulatingSupply: coin.circulatingSupply,
        maxSupply: null,
        priceChangePercentage24h: coin.priceChangePercentage24h,
        allTimeHigh: 0,
        allTimeHighDate: null,
        allTimeLow: 0,
        allTimeLowDate: null,
        categories: [],
        description: '',
        homepage: null,
        blockchainSite: null,
        coingeckoUrl: `https://www.coingecko.com/en/coins/${coin.id}`,
        coinmarketcapUrl: `https://coinmarketcap.com/currencies/${coin.id}/`,
        sparkline7d: coin.sparkline7d,
        chartPrices7d: coin.sparkline7d,
        chartVolumes7d: syntheticVolumes,
        source: 'coingecko-cache' as const
    };
}

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

        const sparklineTail = persisted.value.sparkline7d.length > 24
            ? persisted.value.sparkline7d.slice(-24)
            : persisted.value.sparkline7d;
        const computedLow24h = sparklineTail.length ? Math.min(...sparklineTail) : persisted.value.currentPrice;
        const computedHigh24h = sparklineTail.length ? Math.max(...sparklineTail) : persisted.value.currentPrice;
        const coinWithDerivedRange = {
            ...persisted.value,
            low24h: persisted.value.low24h ?? computedLow24h,
            high24h: persisted.value.high24h ?? computedHigh24h
        };

        const hasAtl = coinWithDerivedRange.allTimeLow > 0;
        const atlFallback = hasAtl ? null : await deriveAtlFromPersistedCharts(coinId);
        const coinWithDerivedAtl = atlFallback
            ? {
                ...coinWithDerivedRange,
                allTimeLow: atlFallback.allTimeLow,
                allTimeLowDate: atlFallback.allTimeLowDate
            }
            : coinWithDerivedRange;

        if (atlFallback) {
            void writeCoinBreakdownSnapshot(coinId, coinWithDerivedAtl);
        }

        return json({
            coin: coinWithDerivedAtl,
            stale: ageMs > BREAKDOWN_STALE_MS,
            source: 'db-cache',
            snapshotTs: persisted.ts
        });
    }

    const marketSnapshot = await readPersistentMarketSnapshot();
    const fallbackCoin = marketSnapshot?.coins.find((coin) => coin.id === coinId) ?? null;
    if (fallbackCoin) {
        const derived = buildDerivedBreakdownFromMarketCoin(fallbackCoin);
        await writeCoinBreakdownSnapshot(coinId, derived);
        void refreshCoinNow(fetch, coinId);

        return json({
            coin: derived,
            stale: true,
            source: 'db-derived-market-snapshot',
            warning: `Serving derived '${coinId}' breakdown from persisted market snapshot while detail refresh is in progress.`
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
