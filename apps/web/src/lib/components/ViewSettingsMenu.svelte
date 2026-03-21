<script lang="ts">
    import type {
        ViewSettings,
        OverviewStyleVariant,
    } from "../composables/useViewSettings.svelte";

    const { settings }: { settings: ViewSettings } = $props();

    const overviewStyleOptions: Array<{
        value: OverviewStyleVariant;
        label: string;
    }> = [
        { value: "separate", label: "Separate bubbles" },
        { value: "unified", label: "One bubble" },
        { value: "minimal", label: "Flat / minimal" },
    ];

    let open = $state(false);
    let menuEl = $state<HTMLElement | null>(null);

    $effect(() => {
        if (!open) return;

        const onClickOutside = (e: MouseEvent) => {
            if (menuEl && !menuEl.contains(e.target as Node)) {
                open = false;
            }
        };

        document.addEventListener("click", onClickOutside);
        return () => document.removeEventListener("click", onClickOutside);
    });
</script>

<div class="settings-dropdown" bind:this={menuEl}>
    <button
        class="settings-pill"
        type="button"
        aria-label="View settings"
        aria-expanded={open}
        onclick={() => (open = !open)}>⚙</button
    >

    {#if open}
        <div class="settings-panel">
            <fieldset class="settings-group">
                <legend>Overview style</legend>
                {#each overviewStyleOptions as opt}
                    <label class="settings-radio">
                        <input
                            type="radio"
                            name="overview-style"
                            value={opt.value}
                            checked={settings.overviewStyle === opt.value}
                            onchange={() => {
                                settings.overviewStyle = opt.value;
                            }}
                        />
                        {opt.label}
                    </label>
                {/each}
            </fieldset>
            <fieldset class="settings-group">
                <legend>Market cap pill</legend>
                <label class="settings-toggle">
                    <input
                        type="checkbox"
                        checked={settings.showMarketCapPill}
                        onchange={() => {
                            settings.showMarketCapPill =
                                !settings.showMarketCapPill;
                        }}
                    />
                    Show pill in overview heading
                </label>
            </fieldset>
        </div>
    {/if}
</div>
