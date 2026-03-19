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
    stale?: boolean;
    warning?: string;
    error?: string;
}

export async function loadMarketsPageData(fetchFn: typeof fetch) {
    const response = await fetchFn('/api/markets');
    const payload = (await response.json()) as MarketsResponse;

    return {
        coins: payload.coins,
        global: payload.global,
        headlines: payload.headlines,
        highlights: payload.highlights,
        source: payload.source,
        snapshotTs: payload.snapshotTs ?? null,
        stale: payload.stale ?? false,
        warning: payload.warning ?? null,
        error: payload.error ?? null
    };
}
