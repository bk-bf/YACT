import { browser } from '$app/environment';
import type { PageLoad } from './$types';

import {
    createEmptyMarketsPageData,
    loadMarketsPageData,
} from '../lib/pages/markets/markets-page.data';

// Ownership contract (BUG-002):
// - Route loader is the canonical owner of markets page payload for first render
//   and client navigation.
// - Components must render this payload directly and avoid independent refresh
//   loops that can regress values during hydration.
export const load: PageLoad = async ({ fetch }) => {
    if (browser) {
        // Keep client-side navigation instant; page view performs post-mount recovery fetch.
        return createEmptyMarketsPageData();
    }

    // Fetch fresh data for SSR and all client navigations.
    // SvelteKit request deduplication handles concurrent requests automatically.
    return loadMarketsPageData(fetch, 2200);
};
