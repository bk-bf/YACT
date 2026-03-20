interface WatchlistCoin {
    id: string;
    symbol: string;
    name: string;
    currentPrice: number;
    priceChangePercentage24h: number;
    totalVolume24h: number;
    marketCapRank: number;
}

interface MarketsResponse {
    coins?: WatchlistCoin[];
    snapshotTs?: number;
    ts?: number;
    stale?: boolean;
    error?: string;
}

export interface WatchlistPageData {
    items: WatchlistCoin[];
    snapshotTs: number | null;
    stale: boolean;
    error?: string;
}

const WATCHLIST_IDS = ["bitcoin", "ethereum"];

function placeholderCoin(id: string, symbol: string, name: string): WatchlistCoin {
    return {
        id,
        symbol,
        name,
        currentPrice: 0,
        priceChangePercentage24h: 0,
        totalVolume24h: 0,
        marketCapRank: 0,
    };
}

const WATCHLIST_PLACEHOLDERS: WatchlistCoin[] = [
    placeholderCoin("bitcoin", "BTC", "Bitcoin"),
    placeholderCoin("ethereum", "ETH", "Ethereum"),
];

function normalizeWatchlistData(payload: Partial<MarketsResponse> | null): WatchlistPageData {
    const coins = Array.isArray(payload?.coins) ? payload.coins : [];
    const map = new Map(coins.map((coin) => [coin.id, coin]));

    const items = WATCHLIST_IDS.map((id, index) => {
        const next = map.get(id);
        if (next) {
            return next;
        }
        return WATCHLIST_PLACEHOLDERS[index];
    });

    return {
        items,
        snapshotTs: payload?.snapshotTs ?? payload?.ts ?? null,
        stale: payload?.stale ?? false,
        error: payload?.error,
    };
}

export function createInitialWatchlistPageData(): WatchlistPageData {
    return normalizeWatchlistData({ stale: true });
}

export async function loadWatchlistPageData(fetchFn: typeof fetch): Promise<WatchlistPageData> {
    try {
        const response = await fetchFn("/api/markets");
        const payload = (await response.json()) as Partial<MarketsResponse>;

        if (!response.ok) {
            return normalizeWatchlistData({ ...payload, stale: true });
        }

        return normalizeWatchlistData(payload);
    } catch {
        return createInitialWatchlistPageData();
    }
}
