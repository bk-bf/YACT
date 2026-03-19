import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadCoinDetailPageData } from '../../../lib/pages/coin-detail/coin-detail-page.data';

export const load: PageLoad = async ({ fetch, params }) => {
    if (!params.id) {
        throw error(400, 'Missing coin id.');
    }

    return loadCoinDetailPageData(fetch, params.id);
};
