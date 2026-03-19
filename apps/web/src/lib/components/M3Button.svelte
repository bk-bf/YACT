<script lang="ts">
    export let href = "";
    export let tone: "filled" | "tonal" | "outlined" = "filled";
</script>

<a class={`m3-button ${tone}`} {href}>
    <slot />
</a>
