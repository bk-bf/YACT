<script lang="ts">
    import CoinDetailPageView from "../../../lib/pages/coin-detail/CoinDetailPageView.svelte";

    let { data } = $props();
</script>

<CoinDetailPageView {data} />
