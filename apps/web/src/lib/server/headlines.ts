export interface CryptoHeadline {
    id: string;
    title: string;
    url: string;
    source: string;
    publishedAt: string;
}

interface RedditPost {
    id: string;
    title: string;
    permalink: string;
    url: string;
    subreddit: string;
    created_utc: number;
    score: number;
    over_18: boolean;
    stickied: boolean;
}

interface RedditChild {
    data: RedditPost;
}

interface RedditListing {
    data: {
        children: RedditChild[];
    };
}

const REDDIT_ENDPOINTS = [
    'https://www.reddit.com/r/CryptoCurrency/hot.json?limit=25',
    'https://www.reddit.com/r/Bitcoin/hot.json?limit=25'
] as const;

const REDDIT_HEADERS = {
    accept: 'application/json',
    'user-agent': 'yact/1.0 (crypto-headlines)'
};

function sanitizeTitle(title: string): string {
    return title.replace(/\s+/g, ' ').trim();
}

function toHeadline(post: RedditPost): CryptoHeadline {
    return {
        id: post.id,
        title: sanitizeTitle(post.title),
        url: post.url?.startsWith('http') ? post.url : `https://www.reddit.com${post.permalink}`,
        source: `Reddit r/${post.subreddit}`,
        publishedAt: new Date(post.created_utc * 1000).toISOString()
    };
}

function isQualityPost(post: RedditPost): boolean {
    const title = sanitizeTitle(post.title).toLowerCase();
    if (!title || title.length < 20) {
        return false;
    }

    if (post.over_18 || post.stickied) {
        return false;
    }

    if (title.includes('daily discussion') || title.includes('daily crypto discussion')) {
        return false;
    }

    if (post.score < 25) {
        return false;
    }

    const url = post.url.toLowerCase();
    if (
        url.includes('reddit.com') ||
        url.includes('redd.it') ||
        url.includes('i.redd.it') ||
        url.includes('v.redd.it')
    ) {
        return false;
    }

    return true;
}

export async function getTopCryptoHeadlines(fetchFn: typeof fetch, limit = 5): Promise<CryptoHeadline[]> {
    const target = Math.max(3, Math.min(limit, 5));

    const results = await Promise.all(
        REDDIT_ENDPOINTS.map(async (endpoint) => {
            const response = await fetchFn(endpoint, { headers: REDDIT_HEADERS });
            if (!response.ok) {
                throw new Error(`Crypto headlines request failed with status ${response.status}`);
            }

            const payload = (await response.json()) as RedditListing;
            return payload.data.children.map((child) => child.data);
        })
    );

    const merged = results
        .flat()
        .filter(isQualityPost)
        .sort((a, b) => b.score - a.score);

    const seen = new Set<string>();
    const deduped = merged.filter((post) => {
        const key = sanitizeTitle(post.title).toLowerCase();
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });

    return deduped.slice(0, target).map(toHeadline);
}

export function getFallbackCryptoHeadlines(): CryptoHeadline[] {
    return [];
}
