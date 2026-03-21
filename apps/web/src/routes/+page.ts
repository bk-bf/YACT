import type { PageLoad } from './$types';

import { loadMarketsPageDataWithTimeout } from '../lib/pages/markets/markets-page.data';

export const load: PageLoad = async ({ fetch }) => {
    // Single unified fetch path for both SSR and client navigation.
    // SvelteKit's request deduplication handles concurrent requests automatically.
    // Timeout is set generous (3500ms) to accommodate /api/markets endpoint latency (~1s).
    return loadMarketsPageDataWithTimeout(fetch, 3500);
};
