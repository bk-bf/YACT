import type { MarketCoin } from '../types/market';
import { readPersistentMarketSnapshot } from './persistentMarketSnapshot';

const COINGECKO_MARKETS_ENDPOINT =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h';
const COINGECKO_GLOBAL_ENDPOINT = 'https://api.coingecko.com/api/v3/global';
const COINGECKO_COIN_ENDPOINT_BASE = 'https://api.coingecko.com/api/v3/coins';
const COINGECKO_ASSET_PLATFORMS_ENDPOINT = 'https://api.coingecko.com/api/v3/asset_platforms';
const CRYPTOCOMPARE_API_BASE = 'https://min-api.cryptocompare.com/data/v2';
const COINPAPRIKA_API_BASE = 'https://api.coinpaprika.com/v1';
const PLATFORM_LOGO_CACHE_TTL_MS = 14 * 24 * 60 * 60_000;

const MARKET_CACHE_TTL_MS = 60_000;
const CHART_DEBUG_PREFIX = '[chart-debug]';

type MarketCache = {
    coins: MarketCoin[];
    fetchedAt: number;
};

export interface GlobalMarketSummary {
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

export interface CoinBreakdown {
    id: string;
    symbol: string;
    name: string;
    image: string;
    currentPrice: number;
    marketCap: number;
    marketCapRank: number;
    apiId: string;
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
    source: 'coingecko' | 'coingecko-cache' | 'coinpaprika';
}

type GlobalCache = {
    summary: GlobalMarketSummary;
    fetchedAt: number;
};

type GasCache = {
    gwei: number;
    fetchedAt: number;
};

let marketCache: MarketCache | null = null;
let globalCache: GlobalCache | null = null;
let gasCache: GasCache | null = null;
let platformLogoCache: PlatformLogoCache | null = null;

type PlatformLogoCache = {
    fetchedAt: number;
    byKey: Record<string, string>;
};

interface CoinGeckoMarketCoin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    total_volume: number;
    circulating_supply: number | null;
    market_cap_rank: number;
    price_change_percentage_24h: number | null;
    sparkline_in_7d?: {
        price: number[];
    };
}

interface CoinGeckoGlobalResponse {
    data: {
        total_market_cap: {
            usd: number;
        };
        total_volume: {
            usd: number;
        };
        market_cap_change_percentage_24h_usd: number;
        market_cap_percentage: {
            btc: number;
            eth: number;
        };
        markets: number;
        active_cryptocurrencies: number;
    };
}

interface CoinGeckoCoinDetailResponse {
    id: string;
    symbol: string;
    name: string;
    image?: {
        large?: string;
    };
    market_cap_rank?: number;
    categories?: string[];
    description?: {
        en?: string;
    };
    links?: {
        homepage?: string[];
        blockchain_site?: string[];
        whitepaper?: string | string[];
        official_forum_url?: string[];
        chat_url?: string[];
        announcement_url?: string[];
        subreddit_url?: string;
        twitter_screen_name?: string;
        facebook_username?: string;
        telegram_channel_identifier?: string | string[];
    };
    platforms?: Record<string, string | null>;
    market_data?: {
        current_price?: {
            usd?: number;
        };
        market_cap?: {
            usd?: number;
        };
        total_volume?: {
            usd?: number;
        };
        low_24h?: {
            usd?: number;
        };
        high_24h?: {
            usd?: number;
        };
        circulating_supply?: number | null;
        max_supply?: number | null;
        price_change_percentage_24h?: number | null;
        ath?: {
            usd?: number;
        };
        ath_date?: {
            usd?: string;
        };
        atl?: {
            usd?: number;
        };
        atl_date?: {
            usd?: string;
        };
        sparkline_7d?: {
            price?: number[];
        };
    };
}

interface CoinGeckoMarketChartResponse {
    prices?: Array<[number, number]>;
    total_volumes?: Array<[number, number]>;
}

interface CoinGeckoAssetPlatformResponse {
    id?: string;
    name?: string;
    shortname?: string;
    image?:
    | string
    | {
        thumb?: string;
        small?: string;
        large?: string;
    };
}

export type CoinChartRange = '24h' | '7d' | '1m' | '3m' | 'ytd' | '1y' | 'max';

export interface CoinChartSeries {
    prices: number[];
    volumes: number[];
    timestamps: number[];
    source: 'coingecko' | 'coingecko-cache' | 'db-derived' | 'cryptocompare';
}

interface CryptoCompareCandle {
    time: number;
    close: number;
    volumeto: number;
}

interface CryptoCompareResponse {
    Response?: string;
    Data?: {
        Data?: CryptoCompareCandle[];
    };
}

interface JsonRpcGasResponse {
    jsonrpc?: string;
    id?: number;
    result?: string;
}

interface CoinPaprikaSearchResponse {
    id: string;
    name: string;
    symbol: string;
    rank: number;
    is_active: boolean;
    type: string;
}

interface CoinPaprikaCoinResponse {
    id: string;
    name: string;
    symbol: string;
    rank: number;
    description?: string;
    links?: {
        website?: string[];
        explorer?: string[];
    };
    max_supply?: number | null;
}

interface CoinPaprikaTickerResponse {
    id: string;
    rank?: number;
    circulating_supply?: number;
    max_supply?: number | null;
    quotes?: {
        USD?: {
            price?: number;
            market_cap?: number;
            volume_24h?: number;
            percent_change_24h?: number;
            ath_price?: number;
            ath_date?: string;
        };
    };
}

const ETH_RPC_GAS_ENDPOINTS = [
    'https://eth.llamarpc.com',
    'https://cloudflare-eth.com',
    'https://ethereum-rpc.publicnode.com',
    'https://rpc.ankr.com/eth'
];

function normalizeCoin(coin: CoinGeckoMarketCoin): MarketCoin {
    const sparkline = coin.sparkline_in_7d?.price ?? [];

    return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        totalVolume24h: coin.total_volume,
        circulatingSupply: coin.circulating_supply ?? 0,
        marketCapRank: coin.market_cap_rank,
        priceChangePercentage24h: coin.price_change_percentage_24h ?? 0,
        sparkline7d: sparkline.length > 1 ? sparkline : [coin.current_price, coin.current_price]
    };
}

function buildMarketCapSparkline(coins: MarketCoin[]): number[] {
    const withSparkline = coins.filter((coin) => coin.sparkline7d.length > 1 && coin.currentPrice > 0);

    if (!withSparkline.length) {
        return [0, 0, 0, 0, 0, 0, 0];
    }

    const points = Math.min(...withSparkline.map((coin) => coin.sparkline7d.length));
    const normalized: number[] = [];

    for (let i = 0; i < points; i += 1) {
        const cap = withSparkline.reduce((sum, coin) => {
            const ratio = coin.sparkline7d[i] / coin.currentPrice;
            return sum + coin.marketCap * ratio;
        }, 0);
        normalized.push(cap);
    }

    return normalized;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('request timeout')), timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

function normalizePlatformKey(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function extractPlatformLogoUrl(platform: CoinGeckoAssetPlatformResponse): string | null {
    const image = platform.image;
    if (typeof image === 'string' && /^https?:\/\//i.test(image)) {
        return image;
    }

    if (image && typeof image === 'object') {
        const candidate = image.small ?? image.thumb ?? image.large;
        if (typeof candidate === 'string' && /^https?:\/\//i.test(candidate)) {
            return candidate;
        }
    }

    return null;
}

async function getPlatformLogoCache(fetchFn: typeof fetch): Promise<PlatformLogoCache | null> {
    const now = Date.now();
    if (platformLogoCache && now - platformLogoCache.fetchedAt < PLATFORM_LOGO_CACHE_TTL_MS) {
        return platformLogoCache;
    }

    try {
        const response = await withTimeout(
            fetchFn(COINGECKO_ASSET_PLATFORMS_ENDPOINT, {
                headers: {
                    accept: 'application/json'
                }
            }),
            6_000
        );

        if (!response.ok) {
            return platformLogoCache;
        }

        const payload = (await response.json()) as CoinGeckoAssetPlatformResponse[];
        const byKey: Record<string, string> = {};

        for (const platform of payload) {
            const logoUrl = extractPlatformLogoUrl(platform);
            if (!logoUrl) {
                continue;
            }

            if (platform.id?.trim()) {
                byKey[normalizePlatformKey(platform.id)] = logoUrl;
            }
            if (platform.name?.trim()) {
                byKey[normalizePlatformKey(platform.name)] = logoUrl;
            }
            if (platform.shortname?.trim()) {
                byKey[normalizePlatformKey(platform.shortname)] = logoUrl;
            }
        }

        const cache: PlatformLogoCache = {
            fetchedAt: now,
            byKey
        };
        platformLogoCache = cache;
        return cache;
    } catch {
        return platformLogoCache;
    }
}

function resolvePlatformLogo(cache: PlatformLogoCache | null, chain: string): string | null {
    if (!cache) {
        return null;
    }

    return cache.byKey[normalizePlatformKey(chain)] ?? null;
}

export async function enrichContractsWithPlatformLogos(
    fetchFn: typeof fetch,
    contracts: Array<{ chain: string; address: string; logoUrl: string | null }>
): Promise<Array<{ chain: string; address: string; logoUrl: string | null }>> {
    if (!contracts.length) {
        return contracts;
    }

    const platformCache = await getPlatformLogoCache(fetchFn);
    if (!platformCache) {
        return contracts;
    }

    return contracts.map((entry) => {
        if (entry.logoUrl) {
            return entry;
        }

        return {
            ...entry,
            logoUrl: resolvePlatformLogo(platformCache, entry.chain)
        };
    });
}

async function fetchMarketsWithRetry(fetchFn: typeof fetch): Promise<Response> {
    const first = await fetchFn(COINGECKO_MARKETS_ENDPOINT, {
        headers: {
            accept: 'application/json'
        }
    });

    if (first.status !== 429) {
        return first;
    }

    await sleep(1200);

    return fetchFn(COINGECKO_MARKETS_ENDPOINT, {
        headers: {
            accept: 'application/json'
        }
    });
}

async function fetchGlobalWithRetry(fetchFn: typeof fetch): Promise<Response> {
    const first = await fetchFn(COINGECKO_GLOBAL_ENDPOINT, {
        headers: {
            accept: 'application/json'
        }
    });

    if (first.status !== 429) {
        return first;
    }

    await sleep(1200);

    return fetchFn(COINGECKO_GLOBAL_ENDPOINT, {
        headers: {
            accept: 'application/json'
        }
    });
}

async function fetchCoinByIdWithRetry(fetchFn: typeof fetch, coinId: string): Promise<Response> {
    const endpoint =
        `${COINGECKO_COIN_ENDPOINT_BASE}/${encodeURIComponent(coinId)}` +
        '?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true';

    const first = await fetchFn(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });

    if (first.status !== 429) {
        return first;
    }

    await sleep(1200);

    return fetchFn(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });
}

async function resolveCoinPaprikaId(fetchFn: typeof fetch, coinId: string, cachedCoin: MarketCoin | null): Promise<string | null> {
    const query = encodeURIComponent(cachedCoin?.name ?? coinId);
    const endpoint = `${COINPAPRIKA_API_BASE}/search?q=${query}&c=currencies`;

    const response = await fetchFn(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });
    if (!response.ok) {
        return null;
    }

    const payload = (await response.json()) as { currencies?: CoinPaprikaSearchResponse[] };
    const currencies = payload.currencies ?? [];
    if (!currencies.length) {
        return null;
    }

    const byExactId = currencies.find((entry) => entry.id.endsWith(`-${coinId}`));
    if (byExactId) {
        return byExactId.id;
    }

    const targetSymbol = cachedCoin?.symbol?.toUpperCase();
    if (targetSymbol) {
        const bySymbol = currencies.find((entry) => entry.symbol.toUpperCase() === targetSymbol);
        if (bySymbol) {
            return bySymbol.id;
        }
    }

    const targetName = (cachedCoin?.name ?? coinId).toLowerCase();
    const byName = currencies.find((entry) => entry.name.toLowerCase() === targetName);
    if (byName) {
        return byName.id;
    }

    return currencies[0]?.id ?? null;
}

async function getCoinPaprikaBreakdown(fetchFn: typeof fetch, coinId: string, cachedCoin: MarketCoin | null): Promise<CoinBreakdown | null> {
    const paprikaId = await resolveCoinPaprikaId(fetchFn, coinId, cachedCoin);
    if (!paprikaId) {
        return null;
    }

    const [coinResponse, tickerResponse] = await Promise.all([
        fetchFn(`${COINPAPRIKA_API_BASE}/coins/${encodeURIComponent(paprikaId)}`, {
            headers: { accept: 'application/json' }
        }),
        fetchFn(`${COINPAPRIKA_API_BASE}/tickers/${encodeURIComponent(paprikaId)}`, {
            headers: { accept: 'application/json' }
        })
    ]);

    if (!coinResponse.ok || !tickerResponse.ok) {
        return null;
    }

    const coinPayload = (await coinResponse.json()) as CoinPaprikaCoinResponse;
    const tickerPayload = (await tickerResponse.json()) as CoinPaprikaTickerResponse;
    const usdQuote = tickerPayload.quotes?.USD;

    const currentPrice = usdQuote?.price ?? cachedCoin?.currentPrice ?? 0;
    const atlFromHistory = await fetchCryptoCompareChartSeries(
        coinPayload.symbol ?? cachedCoin?.symbol ?? coinId,
        'max',
        Math.floor(Date.now() / 1000)
    ).then((series) => (series ? deriveAllTimeLowFromSeries(series) : null)).catch(() => null);
    const sparkline7d = cachedCoin?.sparkline7d?.length && cachedCoin.sparkline7d.length > 1
        ? cachedCoin.sparkline7d
        : [currentPrice, currentPrice];
    const range24h = derive24hRangeFromSparkline(sparkline7d, currentPrice);
    const chartPrices7d = sparkline7d;
    const chartVolumes7d = syntheticVolumesFromPrices(chartPrices7d, usdQuote?.volume_24h ?? cachedCoin?.totalVolume24h ?? 0);

    return {
        id: coinId,
        apiId: coinId,
        symbol: (coinPayload.symbol ?? cachedCoin?.symbol ?? coinId).toLowerCase(),
        name: coinPayload.name ?? cachedCoin?.name ?? coinId,
        image: cachedCoin?.image ?? '',
        currentPrice,
        marketCap: usdQuote?.market_cap ?? cachedCoin?.marketCap ?? 0,
        marketCapRank: tickerPayload.rank ?? coinPayload.rank ?? cachedCoin?.marketCapRank ?? 0,
        totalVolume24h: usdQuote?.volume_24h ?? cachedCoin?.totalVolume24h ?? 0,
        low24h: range24h.low24h,
        high24h: range24h.high24h,
        circulatingSupply: tickerPayload.circulating_supply ?? cachedCoin?.circulatingSupply ?? 0,
        maxSupply: tickerPayload.max_supply ?? coinPayload.max_supply ?? null,
        priceChangePercentage24h: usdQuote?.percent_change_24h ?? cachedCoin?.priceChangePercentage24h ?? 0,
        allTimeHigh: usdQuote?.ath_price ?? 0,
        allTimeHighDate: usdQuote?.ath_date ?? null,
        allTimeLow: atlFromHistory?.allTimeLow ?? 0,
        allTimeLowDate: atlFromHistory?.allTimeLowDate ?? null,
        categories: [],
        description: '',
        homepage: firstNonEmpty(coinPayload.links?.website),
        whitepaper: null,
        blockchainSite: firstNonEmpty(coinPayload.links?.explorer),
        websites: normalizeUrlList(coinPayload.links?.website),
        explorers: normalizeUrlList(coinPayload.links?.explorer),
        community: [],
        contracts: [],
        chains: [],
        coingeckoUrl: `https://www.coingecko.com/en/coins/${coinId}`,
        coinmarketcapUrl: `https://coinmarketcap.com/currencies/${coinId}/`,
        sparkline7d,
        chartPrices7d,
        chartVolumes7d,
        source: 'coinpaprika'
    };
}

async function fetchCoinChartWithRetry(
    fetchFn: typeof fetch,
    coinId: string,
    days: string | number,
    interval?: 'hourly' | 'daily'
): Promise<Response> {
    const query = new URLSearchParams({
        vs_currency: 'usd',
        days: String(days)
    });

    if (interval) {
        query.set('interval', interval);
    }

    const endpoint = `${COINGECKO_COIN_ENDPOINT_BASE}/${encodeURIComponent(coinId)}/market_chart?${query.toString()}`;

    const first = await fetchFn(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });

    if (first.status !== 429) {
        return first;
    }

    await sleep(1200);

    return fetchFn(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });
}

async function fetchCoinChartRangeWithRetry(
    fetchFn: typeof fetch,
    coinId: string,
    from: string,
    to: string,
    interval?: 'hourly' | 'daily'
): Promise<Response> {
    const query = new URLSearchParams({
        vs_currency: 'usd',
        from,
        to
    });

    if (interval) {
        query.set('interval', interval);
    }

    const endpoint = `${COINGECKO_COIN_ENDPOINT_BASE}/${encodeURIComponent(coinId)}/market_chart/range?${query.toString()}`;

    const first = await fetchFn(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });

    if (first.status !== 429) {
        return first;
    }

    await sleep(1200);

    return fetchFn(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });
}

function toIsoMinuteString(date: Date): string {
    // CoinGecko docs recommend ISO date strings for best compatibility.
    return date.toISOString().slice(0, 16);
}

function getYtdStartUnixSec(nowUnixSec: number): number {
    const now = new Date(nowUnixSec * 1000);
    return Math.floor(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0) / 1000);
}

function cryptoCompareParamsForRange(
    range: CoinChartRange,
    nowUnixSec: number
): { endpoint: 'histohour' | 'histoday'; limit?: number; allData?: boolean } {
    switch (range) {
        case '24h':
            return { endpoint: 'histohour', limit: 24 };
        case '7d':
            return { endpoint: 'histohour', limit: 24 * 7 };
        case '1m':
            return { endpoint: 'histohour', limit: 24 * 30 };
        case '3m':
            return { endpoint: 'histoday', limit: 90 };
        case 'ytd': {
            const days = Math.max(1, Math.floor((nowUnixSec - getYtdStartUnixSec(nowUnixSec)) / (24 * 3600)));
            return { endpoint: 'histoday', limit: days };
        }
        case '1y':
            return { endpoint: 'histoday', limit: 365 };
        case 'max':
            return { endpoint: 'histoday', allData: true };
        default:
            return { endpoint: 'histoday', limit: 365 };
    }
}

async function fetchCryptoCompareChartSeries(
    symbol: string,
    range: CoinChartRange,
    nowUnixSec: number
): Promise<CoinChartSeries | null> {
    const fsym = symbol.trim().toUpperCase();
    if (!fsym) {
        return null;
    }

    const cfg = cryptoCompareParamsForRange(range, nowUnixSec);
    const query = new URLSearchParams({
        fsym,
        tsym: 'USD'
    });

    if (cfg.allData) {
        query.set('allData', 'true');
    }
    if (typeof cfg.limit === 'number') {
        query.set('limit', String(cfg.limit));
    }

    const endpoint = `${CRYPTOCOMPARE_API_BASE}/${cfg.endpoint}?${query.toString()}`;
    const response = await fetch(endpoint, {
        headers: {
            accept: 'application/json'
        }
    });

    if (!response.ok) {
        return null;
    }

    const payload = (await response.json()) as CryptoCompareResponse;
    const rows = payload.Data?.Data?.filter((row) => Number.isFinite(row.time) && Number.isFinite(row.close)) ?? [];
    if (!rows.length) {
        return null;
    }

    const prices = rows.map((row) => row.close);
    const volumes = rows.map((row) => (Number.isFinite(row.volumeto) ? row.volumeto : 0));
    const timestamps = rows.map((row) => row.time * 1000);

    if (prices.length < 2) {
        return null;
    }

    return {
        prices,
        volumes,
        timestamps,
        source: 'cryptocompare'
    };
}

function syntheticVolumesFromPrices(prices: number[], totalVolume24h: number): number[] {
    const base = totalVolume24h / 24;
    return prices.map((price, index, arr) => {
        if (index === 0) {
            return base;
        }

        const prev = arr[index - 1] || price;
        const relativeMove = Math.abs((price - prev) / (prev || 1));
        return base * (1 + relativeMove * 4);
    });
}

function derive24hRangeFromSparkline(sparkline: number[], currentPrice: number): { low24h: number; high24h: number } {
    const tail = sparkline.length > 24 ? sparkline.slice(-24) : sparkline;
    const values = tail.filter((value) => Number.isFinite(value));
    if (!values.length) {
        return {
            low24h: currentPrice,
            high24h: currentPrice
        };
    }

    return {
        low24h: Math.min(...values),
        high24h: Math.max(...values)
    };
}

function deriveAllTimeLowFromSeries(
    series: CoinChartSeries
): { allTimeLow: number; allTimeLowDate: string | null } | null {
    if (!series.prices.length || series.prices.length !== series.timestamps.length) {
        return null;
    }

    let minPrice = Number.POSITIVE_INFINITY;
    let minTs: number | null = null;

    for (let index = 0; index < series.prices.length; index += 1) {
        const price = series.prices[index];
        const ts = series.timestamps[index];
        if (!Number.isFinite(price) || !Number.isFinite(ts)) {
            continue;
        }

        if (price < minPrice) {
            minPrice = price;
            minTs = ts;
        }
    }

    if (!Number.isFinite(minPrice) || minPrice <= 0) {
        return null;
    }

    return {
        allTimeLow: minPrice,
        allTimeLowDate: minTs ? new Date(minTs).toISOString() : null
    };
}

function buildSyntheticTimestamps(count: number, durationHours: number): number[] {
    if (count <= 0) {
        return [];
    }

    const nowMs = Date.now();
    const startMs = nowMs - durationHours * 3600 * 1000;
    const stepMs = count > 1 ? (nowMs - startMs) / (count - 1) : 0;

    return Array.from({ length: count }, (_, index) => Math.round(startMs + index * stepMs));
}

function getYtdDurationHours(): number {
    const now = new Date();
    const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
    return Math.max(24, Math.floor((Date.now() - startOfYear) / (1000 * 60 * 60)));
}

const COIN_CHART_RANGE_CONFIG: Record<
    CoinChartRange,
    { durationHours?: number; days?: string | number; fromUnixSec?: number; interval?: 'hourly' | 'daily' }
> = {
    // Leave interval undefined to let CoinGecko auto-select granularity per plan/range.
    '24h': { durationHours: 24 },
    '7d': { durationHours: 24 * 7 },
    '1m': { durationHours: 24 * 30 },
    '3m': { durationHours: 24 * 90 },
    ytd: { durationHours: 24 * 365 },
    '1y': { durationHours: 24 * 365 },
    // Fetch full available history with explicit range bounds.
    max: { fromUnixSec: 0 }
};

function firstNonEmpty(values: string[] | undefined): string | null {
    if (!values) {
        return null;
    }

    const match = values.find((value) => typeof value === 'string' && value.trim().length > 0);
    return match ?? null;
}

function normalizeUrlList(values: Array<string | null | undefined> | undefined): string[] {
    if (!values) {
        return [];
    }

    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const value of values) {
        if (typeof value !== 'string') {
            continue;
        }

        const trimmed = value.trim();
        if (!trimmed || !/^https?:\/\//i.test(trimmed) || seen.has(trimmed)) {
            continue;
        }

        seen.add(trimmed);
        normalized.push(trimmed);
    }

    return normalized;
}

function normalizeCommunityLinks(links: Array<{ label: string; url: string }>): Array<{ label: string; url: string }> {
    const seen = new Set<string>();
    const normalized: Array<{ label: string; url: string }> = [];

    for (const link of links) {
        const url = link.url.trim();
        if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) {
            continue;
        }

        seen.add(url);
        normalized.push({ label: link.label, url });
    }

    return normalized;
}

function inferCommunityLabelFromUrl(url: string, fallback: string): string {
    try {
        const host = new URL(url).hostname.toLowerCase();
        if (host === 'reddit.com' || host.endsWith('.reddit.com')) {
            return 'Reddit';
        }
        if (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com')) {
            return 'X';
        }
        if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'm.facebook.com') {
            return 'Facebook';
        }
        if (host === 't.me' || host.endsWith('.t.me') || host === 'telegram.me' || host.endsWith('.telegram.me')) {
            return 'Telegram';
        }
        if (host === 'discord.gg' || host.endsWith('.discord.gg') || host === 'discord.com' || host.endsWith('.discord.com')) {
            return 'Discord';
        }
        if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
            return 'YouTube';
        }
        if (host === 'medium.com' || host.endsWith('.medium.com')) {
            return 'Medium';
        }
    } catch {
        // Keep fallback label for malformed URLs.
    }

    return fallback;
}

function toTelegramUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `https://t.me/${trimmed.replace(/^@/, '')}`;
}

function toPlainText(html: string | undefined): string {
    if (!html) {
        return '';
    }

    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function toCoinBreakdownFromCache(coin: MarketCoin): CoinBreakdown {
    const range24h = derive24hRangeFromSparkline(coin.sparkline7d, coin.currentPrice);
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
        apiId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.currentPrice,
        marketCap: coin.marketCap,
        marketCapRank: coin.marketCapRank,
        totalVolume24h: coin.totalVolume24h,
        low24h: range24h.low24h,
        high24h: range24h.high24h,
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
        whitepaper: null,
        blockchainSite: null,
        websites: [],
        explorers: [],
        community: [],
        contracts: [],
        chains: [],
        coingeckoUrl: `https://www.coingecko.com/en/coins/${coin.id}`,
        coinmarketcapUrl: `https://coinmarketcap.com/currencies/${coin.id}/`,
        sparkline7d: coin.sparkline7d,
        chartPrices7d: coin.sparkline7d,
        chartVolumes7d: syntheticVolumes,
        source: 'coingecko-cache'
    };
}

async function getCachedOrPersistentCoin(coinId: string): Promise<MarketCoin | null> {
    const cachedCoin = getCachedTopMarketCoins()?.coins.find((coin) => coin.id === coinId) ?? null;
    if (cachedCoin) {
        return cachedCoin;
    }

    const persistent = await readPersistentMarketSnapshot();
    if (!persistent) {
        return null;
    }

    return persistent.coins.find((coin) => coin.id === coinId) ?? null;
}

export function getCachedTopMarketCoins(): MarketCache | null {
    if (!marketCache) {
        return null;
    }

    const age = Date.now() - marketCache.fetchedAt;
    if (age > MARKET_CACHE_TTL_MS) {
        return null;
    }

    return marketCache;
}

export function getCachedGlobalMarketSummary(): GlobalCache | null {
    if (!globalCache) {
        return null;
    }

    const age = Date.now() - globalCache.fetchedAt;
    if (age > MARKET_CACHE_TTL_MS) {
        return null;
    }

    return globalCache;
}

export function getCachedGasGwei(): number | null {
    if (!gasCache) {
        return null;
    }

    const age = Date.now() - gasCache.fetchedAt;
    if (age > MARKET_CACHE_TTL_MS) {
        return null;
    }

    return gasCache.gwei;
}

export function getFallbackGlobalMarketSummary(coins: MarketCoin[]): GlobalMarketSummary {
    const totalMarketCapUsd = coins.reduce((sum, coin) => sum + coin.marketCap, 0);
    const totalVolumeUsd = coins.reduce((sum, coin) => sum + coin.totalVolume24h, 0);
    const btc = coins.find((coin) => coin.symbol.toLowerCase() === 'btc');
    const eth = coins.find((coin) => coin.symbol.toLowerCase() === 'eth');

    return {
        totalMarketCapUsd,
        totalVolumeUsd,
        marketCapChangePercentage24hUsd: 0,
        btcDominance: totalMarketCapUsd > 0 && btc ? (btc.marketCap / totalMarketCapUsd) * 100 : 0,
        ethDominance: totalMarketCapUsd > 0 && eth ? (eth.marketCap / totalMarketCapUsd) * 100 : 0,
        totalExchanges: 0,
        activeCryptocurrencies: coins.length,
        gasGwei: null,
        marketCapSparkline7d: buildMarketCapSparkline(coins)
    };
}

async function getGasGwei(): Promise<number | null> {
    for (const endpoint of ETH_RPC_GAS_ENDPOINTS) {
        try {
            const response = await withTimeout(
                fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'user-agent': 'yact/1.0 (gas-fetch)'
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_gasPrice',
                        params: [],
                        id: 1
                    })
                }),
                2_500
            );

            if (!response.ok) {
                continue;
            }

            const payload = (await response.json()) as JsonRpcGasResponse;
            const hexWei = payload.result;
            if (typeof hexWei === 'string' && hexWei.startsWith('0x')) {
                const wei = Number.parseInt(hexWei, 16);
                if (Number.isFinite(wei)) {
                    return wei / 1_000_000_000;
                }
            }
        } catch {
            // Continue to fallback endpoint or null result.
        }
    }

    return null;
}

export async function getLatestGasGwei(): Promise<number | null> {
    const cachedGas = getCachedGasGwei();
    if (cachedGas !== null) {
        return cachedGas;
    }

    const fresh = await getGasGwei();
    if (fresh !== null) {
        gasCache = {
            gwei: fresh,
            fetchedAt: Date.now()
        };
    }

    return fresh;
}

export function getTopGainers(coins: MarketCoin[], count = 3): MarketCoin[] {
    return [...coins]
        .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
        .slice(0, count);
}

export function getTrendingByVolume(coins: MarketCoin[], count = 3): MarketCoin[] {
    return [...coins]
        .sort((a, b) => b.totalVolume24h - a.totalVolume24h)
        .slice(0, count);
}

export async function getGlobalMarketSummary(fetchFn: typeof fetch, coinsForSparkline: MarketCoin[] = []): Promise<GlobalMarketSummary> {
    const cached = getCachedGlobalMarketSummary();

    try {
        const response = await withTimeout(fetchGlobalWithRetry(fetchFn), 5_000);

        if (!response.ok) {
            throw new Error(`CoinGecko global request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as CoinGeckoGlobalResponse;
        const gasGwei = await getLatestGasGwei();
        const gasGweiResolved = gasGwei ?? cached?.summary.gasGwei ?? null;
        const sourceCoins = coinsForSparkline.length ? coinsForSparkline : getCachedTopMarketCoins()?.coins ?? [];
        const summary: GlobalMarketSummary = {
            totalMarketCapUsd: payload.data.total_market_cap.usd,
            totalVolumeUsd: payload.data.total_volume.usd,
            marketCapChangePercentage24hUsd: payload.data.market_cap_change_percentage_24h_usd,
            btcDominance: payload.data.market_cap_percentage.btc,
            ethDominance: payload.data.market_cap_percentage.eth ?? 0,
            totalExchanges: payload.data.markets ?? 0,
            activeCryptocurrencies: payload.data.active_cryptocurrencies,
            gasGwei: gasGweiResolved,
            marketCapSparkline7d: buildMarketCapSparkline(sourceCoins)
        };

        globalCache = {
            summary,
            fetchedAt: Date.now()
        };

        return summary;
    } catch (error) {
        if (cached) {
            return cached.summary;
        }

        if (coinsForSparkline.length) {
            return getFallbackGlobalMarketSummary(coinsForSparkline);
        }

        throw error;
    }
}

export async function getTopMarketCoins(fetchFn: typeof fetch): Promise<MarketCoin[]> {
    const response = await fetchMarketsWithRetry(fetchFn);

    if (!response.ok) {
        throw new Error(`CoinGecko request failed with status ${response.status}`);
    }

    const data = (await response.json()) as CoinGeckoMarketCoin[];
    const normalized = data.map(normalizeCoin);
    marketCache = {
        coins: normalized,
        fetchedAt: Date.now()
    };

    return normalized;
}

export async function getCoinBreakdown(fetchFn: typeof fetch, coinId: string): Promise<CoinBreakdown> {
    const cachedCoin = await getCachedOrPersistentCoin(coinId);
    const platformCache = await getPlatformLogoCache(fetchFn);

    try {
        const detailResponse = await withTimeout(fetchCoinByIdWithRetry(fetchFn, coinId), 6_000);

        if (!detailResponse.ok) {
            throw new Error(`CoinGecko coin request failed with status ${detailResponse.status}`);
        }

        const payload = (await detailResponse.json()) as CoinGeckoCoinDetailResponse;
        const marketData = payload.market_data;
        const sparkline = marketData?.sparkline_7d?.price ?? cachedCoin?.sparkline7d ?? [];
        let chartPrices7d = sparkline;
        let chartVolumes7d: number[] = [];

        try {
            const chartResponse = await withTimeout(fetchCoinChartWithRetry(fetchFn, coinId, 7, 'hourly'), 6_000);

            if (chartResponse.ok) {
                const chartPayload = (await chartResponse.json()) as CoinGeckoMarketChartResponse;
                const prices = chartPayload.prices?.map(([, price]) => price).filter((price) => Number.isFinite(price));
                if (prices && prices.length > 1) {
                    chartPrices7d = prices;
                }

                const volumes = chartPayload.total_volumes
                    ?.map(([, volume]) => volume)
                    .filter((volume) => Number.isFinite(volume));
                if (volumes && volumes.length > 1) {
                    chartVolumes7d = volumes;
                }
            }
        } catch {
            // Chart fetch failures should not drop detail metadata (contracts/chains/links).
        }

        if (chartVolumes7d.length < 2) {
            const fallbackBase = (marketData?.total_volume?.usd ?? cachedCoin?.totalVolume24h ?? 0) / 24;
            chartVolumes7d = chartPrices7d.map((price, index, arr) => {
                if (index === 0) {
                    return fallbackBase;
                }

                const prev = arr[index - 1] || price;
                const relativeMove = Math.abs((price - prev) / (prev || 1));
                return fallbackBase * (1 + relativeMove * 4);
            });
        }

        const websites = normalizeUrlList(payload.links?.homepage);
        const whitepaper = Array.isArray(payload.links?.whitepaper)
            ? firstNonEmpty(payload.links?.whitepaper)
            : typeof payload.links?.whitepaper === 'string' && /^https?:\/\//i.test(payload.links.whitepaper.trim())
                ? payload.links.whitepaper.trim()
                : null;
        const explorers = normalizeUrlList(payload.links?.blockchain_site);
        const telegramLinksRaw = Array.isArray(payload.links?.telegram_channel_identifier)
            ? payload.links?.telegram_channel_identifier
            : payload.links?.telegram_channel_identifier
                ? [payload.links.telegram_channel_identifier]
                : [];
        const telegramLinks = normalizeUrlList(telegramLinksRaw.map((entry) => toTelegramUrl(entry ?? '') ?? ''));
        const community = normalizeCommunityLinks([
            ...normalizeUrlList(payload.links?.official_forum_url).map((url) => ({
                label: inferCommunityLabelFromUrl(url, 'Forum'),
                url
            })),
            ...normalizeUrlList(payload.links?.chat_url).map((url) => ({
                label: inferCommunityLabelFromUrl(url, 'Chat'),
                url
            })),
            ...normalizeUrlList(payload.links?.announcement_url).map((url) => ({
                label: inferCommunityLabelFromUrl(url, 'Announcement'),
                url
            })),
            ...telegramLinks.map((url) => ({ label: 'Telegram', url })),
            ...(payload.links?.subreddit_url
                ? [{ label: 'Reddit', url: payload.links.subreddit_url }]
                : []),
            ...(payload.links?.twitter_screen_name
                ? [{ label: 'X', url: `https://x.com/${payload.links.twitter_screen_name}` }]
                : []),
            ...(payload.links?.facebook_username
                ? [{ label: 'Facebook', url: `https://facebook.com/${payload.links.facebook_username}` }]
                : [])
        ]);
        const contracts = Object.entries(payload.platforms ?? {})
            .filter(([, address]) => typeof address === 'string' && address.trim().length > 0)
            .map(([chain, address]) => ({
                chain,
                address: (address ?? '').trim(),
                logoUrl: resolvePlatformLogo(platformCache, chain)
            }));
        const chains = contracts.map((entry) => entry.chain);

        return {
            id: payload.id,
            apiId: payload.id,
            symbol: payload.symbol,
            name: payload.name,
            image: payload.image?.large ?? cachedCoin?.image ?? '',
            currentPrice: marketData?.current_price?.usd ?? cachedCoin?.currentPrice ?? 0,
            marketCap: marketData?.market_cap?.usd ?? cachedCoin?.marketCap ?? 0,
            marketCapRank: payload.market_cap_rank ?? cachedCoin?.marketCapRank ?? 0,
            totalVolume24h: marketData?.total_volume?.usd ?? cachedCoin?.totalVolume24h ?? 0,
            low24h: marketData?.low_24h?.usd ?? null,
            high24h: marketData?.high_24h?.usd ?? null,
            circulatingSupply: marketData?.circulating_supply ?? cachedCoin?.circulatingSupply ?? 0,
            maxSupply: marketData?.max_supply ?? null,
            priceChangePercentage24h: marketData?.price_change_percentage_24h ?? cachedCoin?.priceChangePercentage24h ?? 0,
            allTimeHigh: marketData?.ath?.usd ?? 0,
            allTimeHighDate: marketData?.ath_date?.usd ?? null,
            allTimeLow: marketData?.atl?.usd ?? 0,
            allTimeLowDate: marketData?.atl_date?.usd ?? null,
            categories: payload.categories ?? [],
            description: toPlainText(payload.description?.en),
            homepage: websites[0] ?? null,
            whitepaper,
            blockchainSite: explorers[0] ?? null,
            websites,
            explorers,
            community,
            contracts,
            chains,
            coingeckoUrl: `https://www.coingecko.com/en/coins/${payload.id}`,
            coinmarketcapUrl: `https://coinmarketcap.com/currencies/${payload.id}/`,
            sparkline7d: sparkline.length > 1 ? sparkline : [marketData?.current_price?.usd ?? 0, marketData?.current_price?.usd ?? 0],
            chartPrices7d: chartPrices7d.length > 1 ? chartPrices7d : [marketData?.current_price?.usd ?? 0, marketData?.current_price?.usd ?? 0],
            chartVolumes7d,
            source: 'coingecko'
        };
    } catch {
        try {
            const paprikaBreakdown = await withTimeout(getCoinPaprikaBreakdown(fetchFn, coinId, cachedCoin), 6_000);
            if (paprikaBreakdown) {
                return paprikaBreakdown;
            }
        } catch {
            // Keep fallback flow below.
        }

        if (cachedCoin) {
            const cachedBreakdown = toCoinBreakdownFromCache(cachedCoin);
            const atlFromHistory = await fetchCryptoCompareChartSeries(
                cachedCoin.symbol,
                'max',
                Math.floor(Date.now() / 1000)
            ).then((series) => (series ? deriveAllTimeLowFromSeries(series) : null)).catch(() => null);

            if (!atlFromHistory) {
                return cachedBreakdown;
            }

            return {
                ...cachedBreakdown,
                allTimeLow: atlFromHistory.allTimeLow,
                allTimeLowDate: atlFromHistory.allTimeLowDate
            };
        }

        throw new Error(`Coin breakdown unavailable for ${coinId}`);
    }
}

export async function getCoinChartSeries(
    fetchFn: typeof fetch,
    coinId: string,
    range: CoinChartRange
): Promise<CoinChartSeries> {
    const config = COIN_CHART_RANGE_CONFIG[range];
    const cachedCoin = await getCachedOrPersistentCoin(coinId);

    try {
        const nowUnixSec = Math.floor(Date.now() / 1000);
        const nowIso = toIsoMinuteString(new Date(nowUnixSec * 1000));

        let response: Response;
        if (config.fromUnixSec !== undefined) {
            console.info(`${CHART_DEBUG_PREFIX} request range endpoint`, {
                coinId,
                range,
                from: toIsoMinuteString(new Date(config.fromUnixSec * 1000)),
                to: nowIso,
                interval: config.interval ?? 'auto'
            });
            response = await withTimeout(
                fetchCoinChartRangeWithRetry(
                    fetchFn,
                    coinId,
                    toIsoMinuteString(new Date(config.fromUnixSec * 1000)),
                    nowIso,
                    config.interval
                ),
                6_000
            );
        } else if (config.days !== undefined) {
            console.info(`${CHART_DEBUG_PREFIX} request days endpoint`, {
                coinId,
                range,
                days: config.days,
                interval: config.interval ?? 'auto'
            });
            response = await withTimeout(
                fetchCoinChartWithRetry(fetchFn, coinId, config.days, config.interval),
                6_000
            );
        } else {
            const durationHours = range === 'ytd' ? getYtdDurationHours() : (config.durationHours ?? 24 * 7);
            const fromUnixSec = nowUnixSec - durationHours * 3600;
            console.info(`${CHART_DEBUG_PREFIX} request timed range endpoint`, {
                coinId,
                range,
                from: toIsoMinuteString(new Date(fromUnixSec * 1000)),
                to: nowIso,
                durationHours,
                interval: config.interval ?? 'auto'
            });
            response = await withTimeout(
                fetchCoinChartRangeWithRetry(
                    fetchFn,
                    coinId,
                    toIsoMinuteString(new Date(fromUnixSec * 1000)),
                    nowIso,
                    config.interval
                ),
                6_000
            );
        }

        if (!response.ok) {
            throw new Error(`CoinGecko chart request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as CoinGeckoMarketChartResponse;
        const priceEntries = payload.prices?.filter(
            (entry): entry is [number, number] =>
                Array.isArray(entry) && entry.length === 2 && Number.isFinite(entry[0]) && Number.isFinite(entry[1])
        ) ?? [];
        const prices = priceEntries.map(([, price]) => price);
        const timestamps = priceEntries.map(([timestamp]) => timestamp);
        const volumes = payload.total_volumes
            ?.map(([, volume]) => volume)
            .filter((volume) => Number.isFinite(volume)) ?? [];

        if (prices.length < 2) {
            throw new Error('Chart series contains insufficient points.');
        }

        const spanHours = timestamps.length > 1
            ? Math.floor((timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60))
            : 0;
        console.info(`${CHART_DEBUG_PREFIX} live series result`, {
            coinId,
            range,
            source: 'coingecko',
            prices: prices.length,
            volumes: volumes.length,
            spanHours
        });

        return {
            prices,
            volumes: volumes.length > 1 ? volumes : syntheticVolumesFromPrices(prices, cachedCoin?.totalVolume24h ?? 0),
            timestamps,
            source: 'coingecko'
        };
    } catch {
        if (cachedCoin?.symbol) {
            try {
                const nowUnixSec = Math.floor(Date.now() / 1000);
                const alt = await fetchCryptoCompareChartSeries(cachedCoin.symbol, range, nowUnixSec);
                if (alt) {
                    console.warn(`${CHART_DEBUG_PREFIX} alternate provider series result`, {
                        coinId,
                        range,
                        source: alt.source,
                        prices: alt.prices.length
                    });
                    return alt;
                }
            } catch {
                // Continue to cache fallback.
            }
        }

        if (cachedCoin) {
            const fallbackPrices = cachedCoin.sparkline7d.length > 1
                ? cachedCoin.sparkline7d
                : [cachedCoin.currentPrice, cachedCoin.currentPrice];
            const fallbackDurationHours = range === 'ytd'
                ? getYtdDurationHours()
                : (COIN_CHART_RANGE_CONFIG[range].durationHours ?? 24 * 365 * 2);

            const fallbackSeries = {
                prices: fallbackPrices,
                volumes: syntheticVolumesFromPrices(fallbackPrices, cachedCoin.totalVolume24h),
                timestamps: buildSyntheticTimestamps(fallbackPrices.length, fallbackDurationHours),
                source: 'coingecko-cache'
            };

            console.warn(`${CHART_DEBUG_PREFIX} fallback series result`, {
                coinId,
                range,
                source: fallbackSeries.source,
                prices: fallbackSeries.prices.length,
                spanHours: fallbackDurationHours
            });

            return fallbackSeries;
        }

        throw new Error(`Coin chart unavailable for ${coinId}`);
    }
}
