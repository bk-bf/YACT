import type { PageLoad } from './$types';

import { createInitialMarketsPageData } from '../lib/pages/markets/markets-page.data';

export const load: PageLoad = async () => createInitialMarketsPageData();
