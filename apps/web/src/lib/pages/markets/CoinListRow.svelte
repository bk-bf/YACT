<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        image: string;
        name: string;
        symbol: string;
        meta: string;
        right: Snippet;
    }

    let { image, name, symbol, meta, right }: Props = $props();
</script>

<li>
    <div class="overview-coin-row">
        <img
            class="overview-coin-logo"
            src={image}
            alt={name}
            width="24"
            height="24"
        />
        <div class="overview-coin-info">
            <span>{name}</span>
            <span class="overview-coin-meta">{symbol} · {meta}</span>
        </div>
    </div>
    {@render right()}
</li>
