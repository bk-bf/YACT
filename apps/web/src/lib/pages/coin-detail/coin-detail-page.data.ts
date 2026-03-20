import { error } from '@sveltejs/kit';

interface CoinBreakdown {
    id: string;
    apiId: string;
    symbol: string;
    name: string;
    image: string;
    currentPrice: number;
    marketCap: number;
    marketCapRank: number;
    totalVolume24h: number;
    low24h: number | null;
    high24h: number | null;
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
    websites: string[];
    explorers: string[];
    community: Array<{ label: string; url: string }>;
    contracts: Array<{ chain: string; address: string }>;
    chains: string[];
    coingeckoUrl: string;
    coinmarketcapUrl: string;
    sparkline7d: number[];
    chartPrices7d: number[];
    chartVolumes7d: number[];
    source: 'coingecko' | 'coingecko-cache' | 'coinpaprika';
}

interface CoinBreakdownResponse {
    coin?: CoinBreakdown;
    snapshotTs?: number;
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
    snapshotTs?: number;
    headlines?: CryptoHeadline[];
    highlights?: {
        trending?: HighlightCoin[];
        topGainers?: HighlightCoin[];
    };
}

export async function loadCoinDetailPageData(fetchFn: typeof fetch, coinId: string) {
    const [coinResponse, marketsResponse] = await Promise.all([
        fetchFn(`/api/coins/${coinId}`),
        fetchFn('/api/markets').catch(() => null)
    ]);

    const payload = (await coinResponse.json()) as CoinBreakdownResponse;

    if (!coinResponse.ok || !payload.coin) {
        throw error(coinResponse.status || 500, payload.error ?? 'Unable to load coin breakdown.');
    }

    let headlines: CryptoHeadline[] = [];
    let trending: HighlightCoin[] = [];
    let topGainers: HighlightCoin[] = [];
    let marketsSnapshotTs: number | null = null;

    if (marketsResponse?.ok) {
        const aux = (await marketsResponse.json()) as MarketsAuxResponse;
        marketsSnapshotTs = aux.snapshotTs ?? null;
        headlines = aux.headlines ?? [];
        trending = aux.highlights?.trending ?? [];
        topGainers = aux.highlights?.topGainers ?? [];
    }

    return {
        coin: payload.coin,
        coinSnapshotTs: payload.snapshotTs ?? null,
        stale: payload.stale ?? false,
        marketsSnapshotTs,
        headlines,
        trending,
        topGainers
    };
}
