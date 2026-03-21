import { browser } from '$app/environment';
import type { PageLoad } from './$types';

import {
    getMarketsDataCache,
    hasMeaningfulMarketsPayload,
    loadMarketsPageData,
    setMarketsDataCache,
} from '../lib/pages/markets/markets-page.data';

// Ownership contract (BUG-002 fix):
// - SSR / first cold browser visit: fetches real data, caches result.
// - Subsequent browser navigations: serve cached data instantly (no zero-state
//   flash), then revalidate in the background so the next visit is fresh.
export const load: PageLoad = async ({ fetch }) => {
    if (browser) {
        const cached = getMarketsDataCache();
        if (cached && hasMeaningfulMarketsPayload(cached)) {
            // Stale-while-revalidate: return immediately, refresh silently.
            void loadMarketsPageData(fetch, 5000).then(setMarketsDataCache);
            return cached;
        }
    }

    const data = await loadMarketsPageData(fetch, browser ? 2000 : 2200);
    setMarketsDataCache(data);
    return data;
};
