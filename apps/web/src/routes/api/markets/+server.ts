import { json } from '@sveltejs/kit';

import { getTopMarketCoins } from '../../../lib/server/coingecko';

export async function GET({ fetch }) {
    try {
        const coins = await getTopMarketCoins(fetch);

        return json({
            source: 'coingecko',
            count: coins.length,
            coins
        });
    } catch (error) {
        return json(
            {
                source: 'coingecko',
                count: 0,
                coins: [],
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 502 }
        );
    }
}
