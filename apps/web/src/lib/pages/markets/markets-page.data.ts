import type { MarketCoin } from '../../types/market';

interface GlobalMarketSummary {
    totalMarketCapUsd: number;
    totalVolumeUsd: number;
    marketCapChangePercentage24hUsd: number;
    btcDominance: number;
    ethDominance: number;
    totalExchanges: number;
    activeCryptocurrencies: number;
    gasGwei: number | null;
    marketCapSparkline7d: number[];
}

interface MarketHighlights {
    trending: MarketCoin[];
    topGainers: MarketCoin[];
}

interface CryptoHeadline {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string;
}

interface MarketsResponse {
    source: string;
    count: number;
    coins: MarketCoin[];
    global: GlobalMarketSummary;
    headlines: CryptoHeadline[];
    highlights: MarketHighlights;
    snapshotTs?: number;
    ts?: number;
    stale?: boolean;
    error?: string;
}

const EMPTY_GLOBAL: GlobalMarketSummary = {
    totalMarketCapUsd: 0,
    totalVolumeUsd: 0,
    marketCapChangePercentage24hUsd: 0,
    btcDominance: 0,
    ethDominance: 0,
    totalExchanges: 0,
    activeCryptocurrencies: 0,
    gasGwei: null,
    marketCapSparkline7d: []
};

const EMPTY_HIGHLIGHTS: MarketHighlights = {
    trending: [],
    topGainers: []
};

type MarketsPageData = ReturnType<typeof normalizeMarketsPayload>;

function normalizeMarketsPayload(payload: Partial<MarketsResponse> | null) {
    const safePayload = payload ?? {};
    const safeHighlights = safePayload.highlights ?? {};
    const safeGlobal = safePayload.global ?? {};

    return {
        coins: Array.isArray(safePayload.coins) ? safePayload.coins : [],
        global: {
            ...EMPTY_GLOBAL,
            ...safeGlobal,
            marketCapSparkline7d: Array.isArray(safeGlobal.marketCapSparkline7d)
                ? safeGlobal.marketCapSparkline7d
                : EMPTY_GLOBAL.marketCapSparkline7d,
        },
        headlines: Array.isArray(safePayload.headlines) ? safePayload.headlines : [],
        highlights: {
            trending: Array.isArray(safeHighlights.trending)
                ? safeHighlights.trending
                : EMPTY_HIGHLIGHTS.trending,
            topGainers: Array.isArray(safeHighlights.topGainers)
                ? safeHighlights.topGainers
                : EMPTY_HIGHLIGHTS.topGainers,
        },
        source: safePayload.source ?? 'analytics-api',
        snapshotTs: safePayload.snapshotTs ?? safePayload.ts ?? null,
        stale: safePayload.stale ?? false,
        error: safePayload.error ?? undefined
    };
}

export function hasMeaningfulMarketsPayload(payload: ReturnType<typeof normalizeMarketsPayload>): boolean {
    return (
        payload.coins.length > 0 ||
        payload.global.totalMarketCapUsd > 0 ||
        payload.highlights.trending.length > 0 ||
        payload.highlights.topGainers.length > 0
    );
}

export function createEmptyMarketsPageData(): MarketsPageData {
    return normalizeMarketsPayload(null);
}

async function fetchMarketsPayload(
    fetchFn: typeof fetch,
    timeoutMs: number,
): Promise<MarketsPageData | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetchFn('/api/markets', {
            signal: controller.signal,
        });

        let payload: Partial<MarketsResponse> = {};
        try {
            payload = (await response.json()) as Partial<MarketsResponse>;
        } catch {
            payload = {};
        }

        return normalizeMarketsPayload(
            response.ok ? payload : { ...payload, stale: true },
        );
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Fetch markets data with timeout protection.
 * Used by both SSR (on hard reload) and client navigation.
 * Always returns populated data or empty structure, never null.
 */
export async function loadMarketsPageData(
    fetchFn: typeof fetch,
    timeoutMs = 3000,
): Promise<MarketsPageData> {
    const result = await fetchMarketsPayload(fetchFn, timeoutMs);
    return result ?? createEmptyMarketsPageData();
}