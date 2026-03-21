<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        title?: string;
        extraClass?: string;
        children: Snippet;
    }

    let { title, extraClass, children }: Props = $props();
</script>

<article class={["coin-rail-card", extraClass].filter(Boolean).join(" ")}>
    {#if title}<h3>{title}</h3>{/if}
    {@render children()}
</article>
