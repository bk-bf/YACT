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
    whitepaper: string | null;
    blockchainSite: string | null;
    websites: string[];
    explorers: string[];
    community: Array<{ label: string; url: string }>;
    contracts: Array<{ chain: string; address: string; logoUrl: string | null }>;
    chains: string[];
    coingeckoUrl: string;
    coinmarketcapUrl: string;
    sparkline7d: number[];
    chartPrices7d: number[];
    chartVolumes7d: number[];
    source: string;
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

interface CoinChartResponse {
    prices?: number[];
    volumes?: number[];
}

async function fetchJsonWithTimeout<T>(
    fetchFn: typeof fetch,
    url: string,
    timeoutMs: number
): Promise<{ ok: boolean; status: number; data: T | null }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchFn(url, { signal: controller.signal });
        if (!response.ok) {
            return { ok: false, status: response.status, data: null };
        }
        const data = (await response.json()) as T;
        return { ok: true, status: response.status, data };
    } catch {
        return { ok: false, status: 0, data: null };
    } finally {
        clearTimeout(timer);
    }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toNullableFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toStringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
}

function toCommunityLinks(value: unknown): Array<{ label: string; url: string }> {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const label = typeof (item as { label?: unknown }).label === 'string' ? (item as { label: string }).label : '';
            const url = typeof (item as { url?: unknown }).url === 'string' ? (item as { url: string }).url : '';
            if (!url.trim()) {
                return null;
            }
            return { label: label || 'Community', url };
        })
        .filter((item): item is { label: string; url: string } => item !== null);
}

function toContracts(value: unknown): Array<{ chain: string; address: string; logoUrl: string | null }> {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }
            const chain = typeof (item as { chain?: unknown }).chain === 'string' ? (item as { chain: string }).chain : '';
            const address = typeof (item as { address?: unknown }).address === 'string' ? (item as { address: string }).address : '';
            const logoUrl = toStringOrNull((item as { logoUrl?: unknown }).logoUrl);
            if (!address.trim()) {
                return null;
            }
            return { chain: chain || 'unknown', address, logoUrl };
        })
        .filter((item): item is { chain: string; address: string; logoUrl: string | null } => item !== null);
}

function normalizeCoinBreakdown(raw: unknown, coinId: string, chart?: CoinChartResponse): CoinBreakdown {
    const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const id = toStringOrNull(data.id) ?? coinId;
    const symbol = toStringOrNull(data.symbol) ?? coinId;
    const name = toStringOrNull(data.name) ?? symbol.toUpperCase();
    const currentPrice = toFiniteNumber(data.currentPrice);
    const chartPrices7d = Array.isArray(chart?.prices) ? chart!.prices.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [];
    const chartVolumes7d = Array.isArray(chart?.volumes) ? chart!.volumes.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [];
    const sparkline7d = toNumberArray(data.sparkline7d);

    return {
        id,
        apiId: toStringOrNull(data.apiId) ?? id,
        symbol,
        name,
        image: toStringOrNull(data.image) ?? '',
        currentPrice,
        marketCap: toFiniteNumber(data.marketCap),
        marketCapRank: toFiniteNumber(data.marketCapRank),
        totalVolume24h: toFiniteNumber(data.totalVolume24h),
        low24h: toNullableFiniteNumber(data.low24h),
        high24h: toNullableFiniteNumber(data.high24h),
        circulatingSupply: toFiniteNumber(data.circulatingSupply),
        maxSupply: toNullableFiniteNumber(data.maxSupply),
        priceChangePercentage24h: toFiniteNumber(data.priceChangePercentage24h),
        allTimeHigh: toFiniteNumber(data.allTimeHigh),
        allTimeHighDate: toStringOrNull(data.allTimeHighDate),
        allTimeLow: toFiniteNumber(data.allTimeLow),
        allTimeLowDate: toStringOrNull(data.allTimeLowDate),
        categories: toStringArray(data.categories),
        description: toStringOrNull(data.description) ?? '',
        homepage: toStringOrNull(data.homepage),
        whitepaper: toStringOrNull(data.whitepaper),
        blockchainSite: toStringOrNull(data.blockchainSite),
        websites: toStringArray(data.websites),
        explorers: toStringArray(data.explorers),
        community: toCommunityLinks(data.community),
        contracts: toContracts(data.contracts),
        chains: toStringArray(data.chains),
        coingeckoUrl: toStringOrNull(data.coingeckoUrl) ?? `https://www.coingecko.com/en/coins/${encodeURIComponent(id)}`,
        coinmarketcapUrl: toStringOrNull(data.coinmarketcapUrl) ?? `https://coinmarketcap.com/currencies/${encodeURIComponent(id)}/`,
        sparkline7d: sparkline7d.length > 0 ? sparkline7d : chartPrices7d,
        chartPrices7d,
        chartVolumes7d,
        source: toStringOrNull(data.source) ?? 'analytics-api'
    };
}

export async function loadCoinDetailPageData(fetchFn: typeof fetch, coinId: string) {
    const [coinResponse, chartResponse] = await Promise.all([
        fetchFn(`/api/coins/${coinId}`),
        fetchFn(`/api/coins/${coinId}/chart?range=7d`).catch(() => null)
    ]);

    const payload = (await coinResponse.json()) as CoinBreakdownResponse;

    if (!coinResponse.ok || !payload.coin) {
        throw error(coinResponse.status || 500, payload.error ?? 'Unable to load coin breakdown.');
    }

    let chartPayload: CoinChartResponse | undefined;
    if (chartResponse?.ok) {
        chartPayload = (await chartResponse.json()) as CoinChartResponse;
    }

    let headlines: CryptoHeadline[] = [];
    let trending: HighlightCoin[] = [];
    let topGainers: HighlightCoin[] = [];
    let marketsSnapshotTs: number | null = null;

    const marketsResult = await fetchJsonWithTimeout<MarketsAuxResponse>(fetchFn, '/api/markets', 1500);
    if (marketsResult.ok && marketsResult.data) {
        const aux = marketsResult.data;
        marketsSnapshotTs = aux.snapshotTs ?? null;
        headlines = aux.headlines ?? [];
        trending = aux.highlights?.trending ?? [];
        topGainers = aux.highlights?.topGainers ?? [];
    }

    return {
        coin: normalizeCoinBreakdown(payload.coin, coinId, chartPayload),
        coinSnapshotTs: payload.snapshotTs ?? null,
        stale: payload.stale ?? false,
        marketsSnapshotTs,
        headlines,
        trending,
        topGainers
    };
}
