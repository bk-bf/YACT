<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        children: Snippet;
    }

    let { title, children }: Props = $props();
</script>

<article class="overview-list-card">
    <header>
        <h3>{title}</h3>
        <!-- TODO(T-007, see .docs/features/open/ROADMAP.md): Wire this placeholder button to a full list view. -->
        <button type="button" class="inline-link">View more ›</button>
    </header>
    <ul>
        {@render children()}
    </ul>
</article>
