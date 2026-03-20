import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { createInitialCoinDetailPageData } from '../../../lib/pages/coin-detail/coin-detail-page.data';

export const load: PageLoad = async ({ params }) => {
    if (!params.id) {
        throw error(400, 'Missing coin id.');
    }

    return createInitialCoinDetailPageData(params.id);
};
