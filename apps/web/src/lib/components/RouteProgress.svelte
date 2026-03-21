<script lang="ts">
    import { navigating } from "$app/stores";

    // On first mount (hard reload / SSR→hydration), show the bar briefly so
    // initial page load gets the same visual feedback as client-side navigation.
    // $effect only runs client-side, so SSR renders the active bar in HTML and
    // the timer clears it ~500ms after hydration completes.
    let initialLoad = $state(true);

    $effect(() => {
        const timer = setTimeout(() => {
            initialLoad = false;
        }, 500);
        return () => clearTimeout(timer);
    });

    const active = $derived($navigating !== null || initialLoad);
</script>

<div class={`route-progress${active ? " active" : ""}`} aria-hidden="true">
    <span class="route-progress-bar"></span>
</div>

<style>
    .route-progress {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        z-index: 200;
        pointer-events: none;
        opacity: 0;
        transition: opacity 120ms ease;
    }

    .route-progress.active {
        opacity: 1;
    }

    .route-progress-bar {
        display: block;
        width: 35%;
        height: 100%;
        background: linear-gradient(90deg, #8b5cf6 0%, #a78bfa 100%);
        box-shadow: 0 0 8px rgba(139, 92, 246, 0.55);
        animation: route-progress-slide 1s ease-in-out infinite;
    }

    @keyframes route-progress-slide {
        0% {
            transform: translateX(-120%);
        }

        50% {
            transform: translateX(90%);
        }

        100% {
            transform: translateX(260%);
        }
    }
</style>
