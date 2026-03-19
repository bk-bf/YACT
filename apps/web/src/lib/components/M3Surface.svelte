<script lang="ts">
    export let title = "";
    export let subtitle = "";
    export let tonal = false;
    export let elevated = false;
</script>

<section
    class={`m3-surface padded ${tonal ? "tonal" : ""} ${elevated ? "elevated" : ""}`}
>
    {#if title}
        <h2 class="m3-surface-title">{title}</h2>
    {/if}
    {#if subtitle}
        <p class="m3-surface-subtitle">{subtitle}</p>
    {/if}
    <slot />
</section>
