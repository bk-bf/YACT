import type { MarketCoin } from '../types/market';

const COINGECKO_MARKETS_ENDPOINT =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h';

const MARKET_CACHE_TTL_MS = 60_000;

const FALLBACK_COINS: MarketCoin[] = [
    {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        image: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 1,
        priceChangePercentage24h: 0
    },
    {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        image: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 2,
        priceChangePercentage24h: 0
    },
    {
        id: 'tether',
        symbol: 'usdt',
        name: 'Tether',
        image: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png?1696501661',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 3,
        priceChangePercentage24h: 0
    },
    {
        id: 'xrp',
        symbol: 'xrp',
        name: 'XRP',
        image: 'https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 4,
        priceChangePercentage24h: 0
    },
    {
        id: 'binancecoin',
        symbol: 'bnb',
        name: 'BNB',
        image: 'https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 5,
        priceChangePercentage24h: 0
    },
    {
        id: 'usd-coin',
        symbol: 'usdc',
        name: 'USDC',
        image: 'https://coin-images.coingecko.com/coins/images/6319/large/USDC.png?1769615602',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 6,
        priceChangePercentage24h: 0
    },
    {
        id: 'solana',
        symbol: 'sol',
        name: 'Solana',
        image: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 7,
        priceChangePercentage24h: 0
    },
    {
        id: 'tron',
        symbol: 'trx',
        name: 'TRON',
        image: 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 8,
        priceChangePercentage24h: 0
    },
    {
        id: 'dogecoin',
        symbol: 'doge',
        name: 'Dogecoin',
        image: 'https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 9,
        priceChangePercentage24h: 0
    },
    {
        id: 'cardano',
        symbol: 'ada',
        name: 'Cardano',
        image: 'https://coin-images.coingecko.com/coins/images/975/large/cardano.png?1696502090',
        currentPrice: 0,
        marketCap: 0,
        marketCapRank: 10,
        priceChangePercentage24h: 0
    }
];

type MarketCache = {
    coins: MarketCoin[];
    fetchedAt: number;
};

let marketCache: MarketCache | null = null;

interface CoinGeckoMarketCoin {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    price_change_percentage_24h: number | null;
}

function normalizeCoin(coin: CoinGeckoMarketCoin): MarketCoin {
    return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        currentPrice: coin.current_price,
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
        priceChangePercentage24h: coin.price_change_percentage_24h ?? 0
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

export function getFallbackTopMarketCoins(): MarketCoin[] {
    return FALLBACK_COINS;
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
