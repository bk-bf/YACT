<script lang="ts">
    // Placeholder filter bar — buttons are not yet wired to filtering state.
    // See TODO(T-007, .docs/features/open/ROADMAP.md) for implementation plan.
    const filters = [
        { label: "Top 100", active: true },
        { label: "Trending" },
        { label: "New Listings" },
        { label: "Layer 1" },
        { label: "DeFi" },
        { label: "AI Tokens" },
        { label: "All" },
        { label: "Highlights" },
        { label: "Base Ecosystem" },
        { label: "Categories" },
        { label: "Payment Solutions" },
        { label: "Perpetuals" },
        { label: "DEX" },
    ];
</script>

<div class="table-filter-bar" role="toolbar" aria-label="Market filters">
    <div class="table-filter-left">
        {#each filters as filter}
            <button
                type="button"
                class="table-filter-item"
                class:active={filter.active}
            >
                {filter.label}
            </button>
        {/each}
    </div>
</div>
