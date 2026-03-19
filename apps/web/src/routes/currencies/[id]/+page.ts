import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

interface CoinBreakdown {
    id: string;
    symbol: string;
    name: string;
    image: string;
    currentPrice: number;
    marketCap: number;
    marketCapRank: number;
    totalVolume24h: number;
    circulatingSupply: number;
    maxSupply: number | null;
    priceChangePercentage24h: number;
    allTimeHigh: number;
    allTimeHighDate: string | null;
    allTimeLow: number;
    allTimeLowDate: string | null;
    categories: string[];
    description: string;
    homepage: string | null;
    blockchainSite: string | null;
    coingeckoUrl: string;
    coinmarketcapUrl: string;
    sparkline7d: number[];
    chartPrices7d: number[];
    source: 'coingecko' | 'coingecko-cache';
}

interface CoinBreakdownResponse {
    coin?: CoinBreakdown;
    stale?: boolean;
    error?: string;
}

interface CryptoHeadline {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string;
}

interface HighlightCoin {
    id: string;
    symbol: string;
    name: string;
    currentPrice: number;
    priceChangePercentage24h: number;
}

interface MarketsAuxResponse {
    headlines?: CryptoHeadline[];
    highlights?: {
        trending?: HighlightCoin[];
        topGainers?: HighlightCoin[];
    };
}

export const load: PageLoad = async ({ fetch, params }) => {
    const [coinResponse, marketsResponse] = await Promise.all([
        fetch(`/api/coins/${params.id}`),
        fetch('/api/markets').catch(() => null)
    ]);

    const payload = (await coinResponse.json()) as CoinBreakdownResponse;

    if (!coinResponse.ok || !payload.coin) {
        throw error(coinResponse.status || 500, payload.error ?? 'Unable to load coin breakdown.');
    }

    let headlines: CryptoHeadline[] = [];
    let trending: HighlightCoin[] = [];
    let topGainers: HighlightCoin[] = [];

    if (marketsResponse?.ok) {
        const aux = (await marketsResponse.json()) as MarketsAuxResponse;
        headlines = aux.headlines ?? [];
        trending = aux.highlights?.trending ?? [];
        topGainers = aux.highlights?.topGainers ?? [];
    }

    return {
        coin: payload.coin,
        stale: payload.stale ?? false,
        headlines,
        trending,
        topGainers
    };
};
