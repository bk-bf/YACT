<script lang="ts">
    import type { CryptoHeadline } from "./coin-detail-page.data";

    const { headlines }: { headlines: CryptoHeadline[] } = $props();

    const headlineTime = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    function formatHeadlineDate(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "--";
        return headlineTime.format(date);
    }

    const sortedHeadlines = $derived(
        [...headlines]
            .sort((a, b) => {
                const tsDelta =
                    +new Date(b.publishedAt) - +new Date(a.publishedAt);
                if (tsDelta !== 0) return tsDelta;
                return a.id.localeCompare(b.id);
            })
            .slice(0, 12),
    );
</script>

<article class="coin-rail-card">
    <h3>Latest</h3>
    <p class="coin-news-subtitle">Here is what happened in crypto today.</p>
    {#if sortedHeadlines.length > 0}
        <ul class="coin-news-list">
            {#each sortedHeadlines as headline}
                <li>
                    <a
                        href={headline.url}
                        target="_blank"
                        rel="noreferrer"
                        class="coin-news-link"
                    >
                        {headline.title}
                    </a>
                    <p class="coin-news-meta">
                        {headline.source} • {formatHeadlineDate(
                            headline.publishedAt,
                        )}
                    </p>
                </li>
            {/each}
        </ul>
    {:else}
        <p class="muted">No headlines available right now.</p>
    {/if}
</article>
