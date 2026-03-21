<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        label: string;
        children: Snippet;
    }

    let { label, children }: Props = $props();
</script>

<div class="info-chip-row">
    <span class="info-row-label">{label}</span>
    <div class="info-chip-wrap">
        {@render children()}
    </div>
</div>
