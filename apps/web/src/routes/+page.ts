import type { PageLoad } from './$types';

import { loadMarketsPageData } from '../lib/pages/markets/markets-page.data';

export const load: PageLoad = async ({ fetch }) => loadMarketsPageData(fetch);
