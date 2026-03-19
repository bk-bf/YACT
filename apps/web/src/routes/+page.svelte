<script lang="ts">
    import MarketsPageView from "../lib/pages/markets/MarketsPageView.svelte";

    let { data } = $props();
</script>

<MarketsPageView {data} />
