import type { PageLoad } from './$types';

import { loadMarketsPageData } from '../lib/pages/markets/markets-page.data';

// Ownership contract (BUG-002):
// - Route loader is the canonical owner of markets page payload for first render
//   and client navigation.
// - Components must render this payload directly and avoid independent refresh
//   loops that can regress values during hydration.
export const load: PageLoad = async ({ fetch }) => {
    // Fetch fresh data for SSR and all client navigations.
    // SvelteKit request deduplication handles concurrent requests automatically.
    return loadMarketsPageData(fetch);
};
