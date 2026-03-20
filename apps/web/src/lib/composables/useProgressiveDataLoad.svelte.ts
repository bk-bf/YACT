/**
 * Progressive data loading composable for Svelte 5
 *
 * Implements the core pattern: load critical data first and update UI immediately,
 * then fetch auxiliary data asynchronously without blocking.
 *
 * Usage:
 *   const { viewData, loadCritical, loadAuxiliary } = useProgressiveDataLoad(initialData);
 *   onMount(() => {
 *     void loadCritical(() => fetchCriticalData());
 *     void loadAuxiliary(() => fetchAuxData());
 *   });
 */

interface ProgressiveLoadState<T> {
    getViewData: () => T;
    getLiveData: () => T | null;
    loadCritical: (loadFn: () => Promise<T>) => Promise<void>;
    loadAuxiliary: (mergeFn: (current: T) => Promise<T>) => Promise<void>;
    getIsLoading: () => boolean;
}

export function useProgressiveDataLoad<T>(getInitialData: () => T): ProgressiveLoadState<T> {
    let liveData = $state<T | null>(null);
    let isLoading = $state(false);
    let requestId = 0;

    const viewData = $derived(liveData ?? getInitialData());

    const loadCritical = async (loadFn: () => Promise<T>): Promise<void> => {
        const currentRequestId = ++requestId;
        isLoading = true;

        try {
            const data = await loadFn();
            if (requestId !== currentRequestId) {
                return;
            }
            liveData = data;
        } finally {
            if (requestId === currentRequestId) {
                isLoading = false;
            }
        }
    };

    const loadAuxiliary = async (
        mergeFn: (current: T) => Promise<T>,
    ): Promise<void> => {
        const currentRequestId = requestId;

        try {
            if (liveData === null) {
                return;
            }
            const mergedData = await mergeFn(liveData);
            if (requestId !== currentRequestId) {
                return;
            }
            liveData = mergedData;
        } catch {
            // Silently fail on auxiliary data load
        }
    };

    return {
        getLiveData: () => liveData,
        getViewData: () => viewData,
        getIsLoading: () => isLoading,
        loadCritical,
        loadAuxiliary,
    };
}
