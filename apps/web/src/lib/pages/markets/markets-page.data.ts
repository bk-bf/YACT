import type { MarketCoin } from '../../types/market';

interface GlobalMarketSummary {
    totalMarketCapUsd: number;
    totalVolumeUsd: number;
    marketCapChangePercentage24hUsd: number;
    btcDominance: number;
    ethDominance: number;
    totalExchanges: number;
    activeCryptocurrencies: number;
    gasGwei: number | null;
    marketCapSparkline7d: number[];
}

interface MarketHighlights {
    trending: MarketCoin[];
    topGainers: MarketCoin[];
}

interface CryptoHeadline {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string;
}

interface MarketsResponse {
    source: string;
    count: number;
    coins: MarketCoin[];
    global: GlobalMarketSummary;
    headlines: CryptoHeadline[];
    highlights: MarketHighlights;
    snapshotTs?: number;
    ts?: number;
    stale?: boolean;
    error?: string;
}

const EMPTY_GLOBAL: GlobalMarketSummary = {
    totalMarketCapUsd: 0,
    totalVolumeUsd: 0,
    marketCapChangePercentage24hUsd: 0,
    btcDominance: 0,
    ethDominance: 0,
    totalExchanges: 0,
    activeCryptocurrencies: 0,
    gasGwei: null,
    marketCapSparkline7d: []
};

const EMPTY_HIGHLIGHTS: MarketHighlights = {
    trending: [],
    topGainers: []
};

function normalizeMarketsPayload(payload: Partial<MarketsResponse> | null) {
    const safePayload = payload ?? {};
    return {
        coins: Array.isArray(safePayload.coins) ? safePayload.coins : [],
        global: safePayload.global ?? EMPTY_GLOBAL,
        headlines: Array.isArray(safePayload.headlines) ? safePayload.headlines : [],
        highlights: safePayload.highlights ?? EMPTY_HIGHLIGHTS,
        source: safePayload.source ?? 'analytics-api',
        snapshotTs: safePayload.snapshotTs ?? safePayload.ts ?? null,
        stale: safePayload.stale ?? false,
        error: safePayload.error ?? undefined
    };
}

export function createInitialMarketsPageData() {
    return normalizeMarketsPayload({
        stale: true
    });
}

export async function loadMarketsPageData(fetchFn: typeof fetch) {
    try {
        const response = await fetchFn('/api/markets');
        const payload = (await response.json()) as Partial<MarketsResponse>;

        if (!response.ok) {
            return normalizeMarketsPayload({
                ...payload,
                stale: true
            });
        }

        return normalizeMarketsPayload(payload);
    } catch {
        return normalizeMarketsPayload({
            stale: true
        });
    }
}
