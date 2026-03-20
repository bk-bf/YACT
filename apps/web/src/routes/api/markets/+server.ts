import { json } from '@sveltejs/kit';

const ANALYTICS_BASE_URL = process.env.YACT_ANALYTICS_URL || 'http://localhost:8000';

function getHighlights(coins: Array<{ priceChangePercentage24h: number; totalVolume24h: number }>) {
    const topGainers = [...coins]
        .sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h)
        .slice(0, 3);
    const trending = [...coins]
        .sort((a, b) => b.totalVolume24h - a.totalVolume24h)
        .slice(0, 3);

    return { topGainers, trending };
}

export async function GET({ fetch }) {
    const [marketsResponse, headlinesResponse] = await Promise.all([
        fetch(`${ANALYTICS_BASE_URL}/api/v1/markets`, {
            headers: { Accept: 'application/json' }
        }),
        fetch(`${ANALYTICS_BASE_URL}/api/v1/headlines`, {
            headers: { Accept: 'application/json' }
        })
    ]);

    if (!marketsResponse.ok) {
        const detail = await marketsResponse.text();
        return json({
            error: `markets upstream failed: HTTP ${marketsResponse.status}`,
            detail
        }, { status: 503 });
    }

    const marketsPayload = await marketsResponse.json();
    const headlinesPayload = headlinesResponse.ok
        ? await headlinesResponse.json()
        : { headlines: [] };

    const coins = Array.isArray(marketsPayload.coins) ? marketsPayload.coins : [];
    const snapshotTs = typeof marketsPayload?.ts === 'number' ? marketsPayload.ts : null;
    return json({
        ...marketsPayload,
        snapshotTs,
        headlines: Array.isArray(headlinesPayload.headlines) ? headlinesPayload.headlines : [],
        highlights: getHighlights(coins),
        stale: false
    });
}
