import type { PageLoad } from "./$types";

import { createInitialWatchlistPageData } from "../../lib/pages/watchlist/watchlist-page.data";

export const load: PageLoad = async () => createInitialWatchlistPageData();
