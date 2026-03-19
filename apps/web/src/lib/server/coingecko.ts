import type { MarketCoin } from '../types/market';

const COINGECKO_MARKETS_ENDPOINT =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h';
const COINGECKO_GLOBAL_ENDPOINT = 'https://api.coingecko.com/api/v3/global';
const COINGECKO_COIN_ENDPOINT_BASE = 'https://api.coingecko.com/api/v3/coins';

const MARKET_CACHE_TTL_MS = 60_000;

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
    chartVolumes7d: number[];
    source: 'coingecko' | 'coingecko-cache';
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
    };
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

export type CoinChartRange = '24h' | '7d' | '1m' | '3m' | 'ytd' | '1y' | 'max';

export interface CoinChartSeries {
    prices: number[];
    volumes: number[];
    source: 'coingecko' | 'coingecko-cache';
}

interface JsonRpcGasResponse {
    jsonrpc?: string;
    id?: number;
    result?: string;
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
    fromUnixSec: number,
    toUnixSec: number,
    interval?: 'hourly' | 'daily'
): Promise<Response> {
    const query = new URLSearchParams({
        vs_currency: 'usd',
        from: String(fromUnixSec),
        to: String(toUnixSec)
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

const COIN_CHART_RANGE_CONFIG: Record<CoinChartRange, { durationHours?: number; days?: string | number; interval?: 'hourly' | 'daily' }> = {
    '24h': { durationHours: 24, interval: 'hourly' },
    '7d': { durationHours: 24 * 7, interval: 'hourly' },
    '1m': { durationHours: 24 * 30, interval: 'hourly' },
    '3m': { durationHours: 24 * 90, interval: 'hourly' },
    ytd: { durationHours: 24 * 365, interval: 'daily' },
    '1y': { durationHours: 24 * 365, interval: 'daily' },
    max: { days: 'max', interval: 'daily' }
};

function firstNonEmpty(values: string[] | undefined): string | null {
    if (!values) {
        return null;
    }

    const match = values.find((value) => typeof value === 'string' && value.trim().length > 0);
    return match ?? null;
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
        source: 'coingecko-cache'
    };
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
    const cachedCoin = getCachedTopMarketCoins()?.coins.find((coin) => coin.id === coinId) ?? null;

    try {
        const [detailResponse, chartResponse] = await Promise.all([
            withTimeout(fetchCoinByIdWithRetry(fetchFn, coinId), 6_000),
            withTimeout(fetchCoinChartWithRetry(fetchFn, coinId, 7, 'hourly'), 6_000)
        ]);

        if (!detailResponse.ok) {
            throw new Error(`CoinGecko coin request failed with status ${detailResponse.status}`);
        }

        const payload = (await detailResponse.json()) as CoinGeckoCoinDetailResponse;
        const marketData = payload.market_data;
        const sparkline = marketData?.sparkline_7d?.price ?? cachedCoin?.sparkline7d ?? [];
        let chartPrices7d = sparkline;
        let chartVolumes7d: number[] = [];

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

        return {
            id: payload.id,
            symbol: payload.symbol,
            name: payload.name,
            image: payload.image?.large ?? cachedCoin?.image ?? '',
            currentPrice: marketData?.current_price?.usd ?? cachedCoin?.currentPrice ?? 0,
            marketCap: marketData?.market_cap?.usd ?? cachedCoin?.marketCap ?? 0,
            marketCapRank: payload.market_cap_rank ?? cachedCoin?.marketCapRank ?? 0,
            totalVolume24h: marketData?.total_volume?.usd ?? cachedCoin?.totalVolume24h ?? 0,
            circulatingSupply: marketData?.circulating_supply ?? cachedCoin?.circulatingSupply ?? 0,
            maxSupply: marketData?.max_supply ?? null,
            priceChangePercentage24h: marketData?.price_change_percentage_24h ?? cachedCoin?.priceChangePercentage24h ?? 0,
            allTimeHigh: marketData?.ath?.usd ?? 0,
            allTimeHighDate: marketData?.ath_date?.usd ?? null,
            allTimeLow: marketData?.atl?.usd ?? 0,
            allTimeLowDate: marketData?.atl_date?.usd ?? null,
            categories: payload.categories ?? [],
            description: toPlainText(payload.description?.en),
            homepage: firstNonEmpty(payload.links?.homepage),
            blockchainSite: firstNonEmpty(payload.links?.blockchain_site),
            coingeckoUrl: `https://www.coingecko.com/en/coins/${payload.id}`,
            coinmarketcapUrl: `https://coinmarketcap.com/currencies/${payload.id}/`,
            sparkline7d: sparkline.length > 1 ? sparkline : [marketData?.current_price?.usd ?? 0, marketData?.current_price?.usd ?? 0],
            chartPrices7d: chartPrices7d.length > 1 ? chartPrices7d : [marketData?.current_price?.usd ?? 0, marketData?.current_price?.usd ?? 0],
            chartVolumes7d,
            source: 'coingecko'
        };
    } catch {
        if (cachedCoin) {
            return toCoinBreakdownFromCache(cachedCoin);
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
    const cachedCoin = getCachedTopMarketCoins()?.coins.find((coin) => coin.id === coinId) ?? null;

    try {
        const nowUnixSec = Math.floor(Date.now() / 1000);

        let response: Response;
        if (config.days !== undefined) {
            response = await withTimeout(
                fetchCoinChartWithRetry(fetchFn, coinId, config.days, config.interval),
                6_000
            );
        } else {
            const ytdDurationHours = (() => {
                const now = new Date();
                const startOfYear = Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0);
                return Math.max(24, Math.floor((Date.now() - startOfYear) / (1000 * 60 * 60)));
            })();
            const durationHours = range === 'ytd' ? ytdDurationHours : (config.durationHours ?? 24 * 7);
            const fromUnixSec = nowUnixSec - durationHours * 3600;
            response = await withTimeout(
                fetchCoinChartRangeWithRetry(fetchFn, coinId, fromUnixSec, nowUnixSec, config.interval),
                6_000
            );
        }

        if (!response.ok) {
            throw new Error(`CoinGecko chart request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as CoinGeckoMarketChartResponse;
        const prices = payload.prices?.map(([, price]) => price).filter((price) => Number.isFinite(price)) ?? [];
        const volumes = payload.total_volumes
            ?.map(([, volume]) => volume)
            .filter((volume) => Number.isFinite(volume)) ?? [];

        if (prices.length < 2) {
            throw new Error('Chart series contains insufficient points.');
        }

        return {
            prices,
            volumes: volumes.length > 1 ? volumes : syntheticVolumesFromPrices(prices, cachedCoin?.totalVolume24h ?? 0),
            source: 'coingecko'
        };
    } catch {
        if (cachedCoin) {
            const fallbackPrices = cachedCoin.sparkline7d.length > 1
                ? cachedCoin.sparkline7d
                : [cachedCoin.currentPrice, cachedCoin.currentPrice];

            return {
                prices: fallbackPrices,
                volumes: syntheticVolumesFromPrices(fallbackPrices, cachedCoin.totalVolume24h),
                source: 'coingecko-cache'
            };
        }

        throw new Error(`Coin chart unavailable for ${coinId}`);
    }
}
