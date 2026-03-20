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
    ts?: number;
    highlights?: {
        trending?: HighlightCoin[];
        topGainers?: HighlightCoin[];
    };
}

interface HeadlinesResponse {
    headlines?: CryptoHeadline[];
}

interface CoinChartResponse {
    prices?: number[];
    volumes?: number[];
}

type FetchJsonResult<T> = { ok: boolean; status: number; data: T | null };

type CacheEntry = {
    expiresAt: number;
    value: unknown;
};

const requestCache = new Map<string, CacheEntry>();

async function fetchJsonWithTimeout<T>(
    fetchFn: typeof fetch,
    url: string,
    timeoutMs: number,
    cacheTtlMs = 0,
): Promise<FetchJsonResult<T>> {
    if (cacheTtlMs > 0) {
        const cached = requestCache.get(url);
        if (cached && cached.expiresAt > Date.now()) {
            return { ok: true, status: 200, data: cached.value as T };
        }
        if (cached) {
            requestCache.delete(url);
        }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchFn(url, { signal: controller.signal });
        if (!response.ok) {
            return { ok: false, status: response.status, data: null };
        }
        const data = (await response.json()) as T;
        if (cacheTtlMs > 0) {
            requestCache.set(url, {
                expiresAt: Date.now() + cacheTtlMs,
                value: data,
            });
        }
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

function fallbackCoinNameForId(coinId: string): string {
    return coinId
        .split('-')
        .filter((part) => part.length > 0)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' ');
}

export function createInitialCoinDetailPageData(coinId: string) {
    const fallbackCoinName = fallbackCoinNameForId(coinId);
    return {
        coin: normalizeCoinBreakdown(
            {
                id: coinId,
                apiId: coinId,
                symbol: coinId,
                name: fallbackCoinName || coinId,
                source: 'unavailable'
            },
            coinId
        ),
        coinSnapshotTs: null,
        stale: true,
        marketsSnapshotTs: null,
        headlines: [],
        trending: [],
        topGainers: []
    };
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loadCoinDetailAuxData(fetchFn: typeof fetch) {
    const [headlines, markets] = await Promise.all([
        loadCoinDetailHeadlinesData(fetchFn),
        loadCoinDetailMarketsAuxData(fetchFn),
    ]);

    return {
        ok:
            headlines.length > 0 ||
            markets.trending.length > 0 ||
            markets.topGainers.length > 0,
        marketsSnapshotTs: markets.marketsSnapshotTs,
        headlines,
        trending: markets.trending,
        topGainers: markets.topGainers,
    };
}

export async function loadCoinDetailHeadlinesData(fetchFn: typeof fetch): Promise<CryptoHeadline[]> {
    const headlinesCacheTtlMs = 30_000;
    const headlinesResult = await fetchJsonWithTimeout<HeadlinesResponse>(
        fetchFn,
        '/api/headlines',
        2500,
        headlinesCacheTtlMs,
    );

    if (!headlinesResult.ok || !headlinesResult.data) {
        return [];
    }

    return headlinesResult.data.headlines ?? [];
}

export async function loadCoinDetailMarketsAuxData(fetchFn: typeof fetch) {
    const timeoutsMs = [2500, 4000, 6000];
    const marketsCacheTtlMs = 20_000;

    for (let i = 0; i < timeoutsMs.length; i += 1) {
        const marketsResult = await fetchJsonWithTimeout<MarketsAuxResponse>(
            fetchFn,
            '/api/markets',
            timeoutsMs[i],
            marketsCacheTtlMs,
        );

        if (marketsResult.ok && marketsResult.data) {
            const aux = marketsResult.data;
            return {
                marketsSnapshotTs: aux.snapshotTs ?? aux.ts ?? null,
                trending: aux.highlights?.trending ?? [],
                topGainers: aux.highlights?.topGainers ?? [],
            };
        }

        if (i < timeoutsMs.length - 1) {
            await delay(300);
        }
    }

    return {
        marketsSnapshotTs: null,
        trending: [],
        topGainers: [],
    };
}

export async function loadCoinDetailPageData(fetchFn: typeof fetch, coinId: string) {
    const coinCacheTtlMs = 15_000;
    const chartCacheTtlMs = 20_000;
    const marketsCacheTtlMs = 20_000;
    const headlinesCacheTtlMs = 30_000;
    const marketsTimeoutMs = 6000;

    const [coinResult, chartResult, marketsResult, headlinesResult] = await Promise.all([
        fetchJsonWithTimeout<CoinBreakdownResponse>(fetchFn, `/api/coins/${coinId}`, 4000, coinCacheTtlMs),
        fetchJsonWithTimeout<CoinChartResponse>(fetchFn, `/api/coins/${coinId}/chart?range=7d`, 3000, chartCacheTtlMs),
        fetchJsonWithTimeout<MarketsAuxResponse>(fetchFn, '/api/markets', marketsTimeoutMs, marketsCacheTtlMs),
        fetchJsonWithTimeout<HeadlinesResponse>(fetchFn, '/api/headlines', 2500, headlinesCacheTtlMs),
    ]);

    let chartPayload: CoinChartResponse | undefined;
    if (chartResult.ok && chartResult.data) {
        chartPayload = chartResult.data;
    }

    let headlines: CryptoHeadline[] = [];
    let trending: HighlightCoin[] = [];
    let topGainers: HighlightCoin[] = [];
    let marketsSnapshotTs: number | null = null;
    if (marketsResult.ok && marketsResult.data) {
        const aux = marketsResult.data;
        marketsSnapshotTs = aux.snapshotTs ?? aux.ts ?? null;
        trending = aux.highlights?.trending ?? [];
        topGainers = aux.highlights?.topGainers ?? [];
    }

    if (headlinesResult.ok && headlinesResult.data) {
        headlines = headlinesResult.data.headlines ?? [];
    }

    const coinPayload = coinResult.ok ? coinResult.data : null;
    const hasCoin = Boolean(coinPayload?.coin);
    const fallbackCoinName = fallbackCoinNameForId(coinId);

    return {
        coin: normalizeCoinBreakdown(
            hasCoin
                ? coinPayload!.coin
                : {
                    id: coinId,
                    apiId: coinId,
                    symbol: coinId,
                    name: fallbackCoinName || coinId,
                    source: 'unavailable'
                },
            coinId,
            chartPayload
        ),
        coinSnapshotTs: coinPayload?.snapshotTs ?? null,
        stale: hasCoin ? (coinPayload?.stale ?? false) : true,
        marketsSnapshotTs,
        headlines,
        trending,
        topGainers
    };
}

export async function loadCoinDetailCriticalData(fetchFn: typeof fetch, coinId: string) {
    const initialData = createInitialCoinDetailPageData(coinId);
    const coinCacheTtlMs = 15_000;
    const chartCacheTtlMs = 20_000;

    const [coinResult, chartResult] = await Promise.all([
        fetchJsonWithTimeout<CoinBreakdownResponse>(fetchFn, `/api/coins/${coinId}`, 2500, coinCacheTtlMs),
        fetchJsonWithTimeout<CoinChartResponse>(fetchFn, `/api/coins/${coinId}/chart?range=7d`, 2500, chartCacheTtlMs),
    ]);

    if (!coinResult.ok || !coinResult.data?.coin) {
        return initialData;
    }

    const chartPayload = chartResult.ok ? chartResult.data ?? undefined : undefined;

    return {
        ...initialData,
        coin: normalizeCoinBreakdown(coinResult.data.coin, coinId, chartPayload),
        coinSnapshotTs: coinResult.data.snapshotTs ?? null,
        stale: coinResult.data.stale ?? false,
    };
}

export async function loadCoinDetailCriticalOnlyData(fetchFn: typeof fetch, coinId: string) {
    const initialData = createInitialCoinDetailPageData(coinId);
    const coinCacheTtlMs = 15_000;
    const chartCacheTtlMs = 20_000;

    const [coinResult, chartResult] = await Promise.all([
        fetchJsonWithTimeout<CoinBreakdownResponse>(fetchFn, `/api/coins/${coinId}`, 3000, coinCacheTtlMs),
        fetchJsonWithTimeout<CoinChartResponse>(fetchFn, `/api/coins/${coinId}/chart?range=7d`, 2500, chartCacheTtlMs),
    ]);

    if (!coinResult.ok || !coinResult.data?.coin) {
        return initialData;
    }

    const chartPayload = chartResult.ok ? chartResult.data ?? undefined : undefined;

    return {
        ...initialData,
        coin: normalizeCoinBreakdown(coinResult.data.coin, coinId, chartPayload),
        coinSnapshotTs: coinResult.data.snapshotTs ?? null,
        stale: coinResult.data.stale ?? false,
        headlines: initialData.headlines,
        trending: initialData.trending,
        topGainers: initialData.topGainers,
        marketsSnapshotTs: initialData.marketsSnapshotTs,
    };
}
