import { json } from '@sveltejs/kit';

import {
    ensureAutoRefreshStarted,
    getAutoRefreshEvents,
    getAutoRefreshStatus
} from '../../../../lib/server/autoRefreshService';

export async function GET({ url }) {
    ensureAutoRefreshStarted();

    const limitParam = Number(url.searchParams.get('limit') ?? '20');
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, Math.floor(limitParam))) : 20;

    return json({
        status: getAutoRefreshStatus(),
        events: getAutoRefreshEvents(limit)
    });
}
