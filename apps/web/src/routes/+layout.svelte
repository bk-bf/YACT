<script lang="ts">
    import "../app.css";
    import AppShellLayout from "../lib/layouts/AppShellLayout.svelte";

    let { children } = $props();
</script>

<AppShellLayout>
    {@render children?.()}
</AppShellLayout>
