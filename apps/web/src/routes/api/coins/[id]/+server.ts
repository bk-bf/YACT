import { json } from '@sveltejs/kit';

import { getCoinBreakdown } from '../../../../lib/server/coingecko';

export async function GET({ fetch, params }) {
    const coinId = params.id;

    if (!coinId) {
        return json({ error: 'Missing coin id.' }, { status: 400 });
    }

    try {
        const coin = await getCoinBreakdown(fetch, coinId);

        return json({
            coin,
            stale: coin.source !== 'coingecko'
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const isNotFound = message.includes('status 404');

        return json(
            {
                error: isNotFound ? `Coin '${coinId}' was not found.` : message
            },
            { status: isNotFound ? 404 : 502 }
        );
    }
}
