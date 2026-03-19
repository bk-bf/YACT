import { json } from '@sveltejs/kit';

import {
    getCachedTopMarketCoins,
    getFallbackTopMarketCoins,
    getTopMarketCoins
} from '../../../lib/server/coingecko';

export async function GET({ fetch }) {
    try {
        const coins = await getTopMarketCoins(fetch);

        return json({
            source: 'coingecko',
            count: coins.length,
            coins,
            stale: false
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const isRateLimit = message.includes('status 429');

        if (isRateLimit) {
            const cached = getCachedTopMarketCoins();
            if (cached) {
                return json({
                    source: 'coingecko-cache',
                    count: cached.coins.length,
                    coins: cached.coins,
                    stale: true,
                    warning: 'CoinGecko rate-limited requests (429). Showing cached market snapshot.'
                });
            }

            const fallback = getFallbackTopMarketCoins();
            return json({
                source: 'local-fallback',
                count: fallback.length,
                coins: fallback,
                stale: true,
                warning: 'CoinGecko rate-limited requests (429). Showing fallback market list.'
            });
        }

        return json(
            {
                source: 'coingecko',
                count: 0,
                coins: [],
                stale: false,
                error: message
            },
            { status: 502 }
        );
    }
}
