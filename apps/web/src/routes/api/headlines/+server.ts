import { json } from '@sveltejs/kit';

const ANALYTICS_BASE_URL = process.env.YACT_ANALYTICS_URL || 'http://localhost:8000';

export async function GET({ fetch }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    let response: Response;
    try {
        response = await fetch(`${ANALYTICS_BASE_URL}/api/v1/headlines`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });
    } catch {
        clearTimeout(timer);
        return json({ headlines: [], error: 'headlines upstream timed out', source: 'timeout', ts: Date.now(), count: 0 });
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        const detail = await response.text();
        return json({
            error: `headlines upstream failed: HTTP ${response.status}`,
            detail,
            headlines: []
        }, { status: 503 });
    }

    const payload = await response.json();
    return json({
        headlines: Array.isArray(payload?.headlines) ? payload.headlines : [],
        source: payload?.source ?? 'analytics-api',
        ts: payload?.ts ?? Date.now(),
        count: Array.isArray(payload?.headlines) ? payload.headlines.length : 0,
        stale: false
    });
}
