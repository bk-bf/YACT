import type { PageLoad } from './$types';

import type { MarketCoin } from '../lib/types/market';

interface MarketsResponse {
    source: string;
    count: number;
    coins: MarketCoin[];
    stale?: boolean;
    warning?: string;
    error?: string;
}

export const load: PageLoad = async ({ fetch }) => {
    const response = await fetch('/api/markets');
    const payload = (await response.json()) as MarketsResponse;

    return {
        coins: payload.coins,
        source: payload.source,
        stale: payload.stale ?? false,
        warning: payload.warning ?? null,
        error: payload.error ?? null
    };
};
