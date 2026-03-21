import { browser } from "$app/environment";
import {
    coerceMarketsPageData,
    hasMeaningfulMarketsPayload,
    isMarketsDataCacheStale,
    loadMarketsPageData,
    setMarketsDataCache,
    type MarketsPageData,
} from "../pages/markets/markets-page.data";

/**
 * useMarketsDataRecovery — encapsulates the three data-lifecycle effects for
 * the markets page: empty-payload recovery retries, shell push sync, and
 * stale-tab background refresh.
 *
 * Must be called synchronously during a Svelte component's script
 * initialisation (same constraint as $state / $effect).
 *
 * @param getData      Reactive getter returning the current active data.
 * @param getRecovered Reactive getter returning the component's recovered-data
 *                     state (null if not yet recovered).
 * @param setRecovered Setter that writes recovered data back to the component.
 */
export function useMarketsDataRecovery(
    getData: () => MarketsPageData,
    getRecovered: () => MarketsPageData | null,
    setRecovered: (next: MarketsPageData) => void,
): void {
    // Recovery retry: if route payload arrived empty, fetch a fresh payload
    // up to 3 times (BUG-002 bounded recovery).
    $effect(() => {
        if (!browser) return;
        if (getRecovered() !== null) return;

        const current = getData();
        if (hasMeaningfulMarketsPayload(current)) return;

        let cancelled = false;

        void (async () => {
            // Exponential backoff: each retry waits longer before hitting the
            // server again, reducing congestion when the server is under load.
            // Timeout per attempt is longer than +page.ts to let aborted
            // requests clear from the server before retrying.
            const delays = [2000, 5000];
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const next = await loadMarketsPageData(fetch, 12000);
                if (cancelled) return;

                if (hasMeaningfulMarketsPayload(next)) {
                    setMarketsDataCache(next);
                    setRecovered(next);
                    window.dispatchEvent(
                        new CustomEvent("yact:global-ready", {
                            detail: next.global,
                        }),
                    );
                    return;
                }

                if (attempt < 2) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, delays[attempt]),
                    );
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    });

    // markets-sync: accept data pushed from the shell's polling cycle.
    $effect(() => {
        if (!browser) return;

        const onMarketsSync = (event: Event) => {
            const customEvent = event as CustomEvent;
            const next = coerceMarketsPageData(
                (customEvent.detail as Record<string, unknown>) ?? null,
            );

            if (hasMeaningfulMarketsPayload(next)) {
                setMarketsDataCache(next);
                setRecovered(next);
            }
        };

        window.addEventListener("yact:markets-sync", onMarketsSync);
        return () => {
            window.removeEventListener("yact:markets-sync", onMarketsSync);
        };
    });

    // Tier-2 stale-tab refresh: silently re-fetch when user returns to a stale
    // tab (>3 min since last fetch).
    $effect(() => {
        if (!browser) return;

        let cancelled = false;

        const onVisibilityChange = () => {
            if (document.visibilityState !== "visible") return;
            if (!isMarketsDataCacheStale()) return;
            if (cancelled) return;

            console.info(
                "[tier-2-refresh] markets: stale tab returned, fetching fresh data",
            );
            void loadMarketsPageData(fetch, 5000).then((next) => {
                if (cancelled) return;
                if (!hasMeaningfulMarketsPayload(next)) return;
                setMarketsDataCache(next);
                setRecovered(next);
                console.info("[tier-2-refresh] markets: updated", {
                    coins: next.coins.length,
                    source: next.source,
                });
                window.dispatchEvent(
                    new CustomEvent("yact:global-ready", {
                        detail: next.global,
                    }),
                );
            });
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            cancelled = true;
            document.removeEventListener(
                "visibilitychange",
                onVisibilityChange,
            );
        };
    });
}
