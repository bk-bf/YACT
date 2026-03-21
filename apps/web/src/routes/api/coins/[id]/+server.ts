import { json } from '@sveltejs/kit';
const ANALYTICS_BASE_URL = process.env.YACT_ANALYTICS_URL || 'http://localhost:8000';

export async function GET({ fetch, params }) {

    const coinId = params.id;

    if (!coinId) {
        return json({ error: 'Missing coin id.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    let response: Response;
    try {
        response = await fetch(`${ANALYTICS_BASE_URL}/api/v1/coins/${encodeURIComponent(coinId)}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
    } catch {
        clearTimeout(timer);
        return json({ error: 'coin upstream timed out or unreachable' }, { status: 503 });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        const detail = await response.text();
        return json({
            error: `coin upstream failed: HTTP ${response.status}`,
            detail
        }, { status: response.status === 404 ? 404 : 503 });
    }

    const payload = await response.json();
    const entry = payload?.coins?.[coinId];
    const breakdown = entry?.breakdown;
    if (!breakdown) {
        return json({
            error: `coin payload missing breakdown for '${coinId}'`
        }, { status: 502 });
    }

    return json({
        coin: breakdown.value,
        stale: false,
        source: 'analytics-api',
        snapshotTs: breakdown.ts
    });
}
