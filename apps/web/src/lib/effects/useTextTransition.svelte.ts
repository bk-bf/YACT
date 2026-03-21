/**
 * useTextTransition — animates a text value change by briefly applying a
 * CSS class that plays a fade-slide-in keyframe animation.
 *
 * Usage:
 *
 *   const titleTransition = createTextTransition();
 *
 *   In script:
 *     $effect(() => { titleTransition.notify(sectionTitle); });
 *
 *   In template:
 *     <h2 class={titleTransition.animating ? 'text-transition-in' : ''}>
 *       {sectionTitle}
 *     </h2>
 *
 * The CSS class 'text-transition-in' is defined in application-shell.css.
 */

export function createTextTransition(durationMs = 300) {
    let _animating = $state(false);
    let _prev: unknown = undefined;
    let _timer: ReturnType<typeof setTimeout> | null = null;

    return {
        get animating(): boolean {
            return _animating;
        },

        /**
         * Call with the current value. Triggers the animation whenever the
         * value changes (skips the very first call so there's no animation on
         * initial mount).
         */
        notify(value: unknown): void {
            if (_prev === undefined) {
                _prev = value;
                return;
            }
            if (value === _prev) return;

            _prev = value;

            if (_timer !== null) clearTimeout(_timer);
            _animating = false;

            // Defer one microtask so Svelte flushes the class removal before
            // re-adding it, restarting the CSS animation cleanly.
            queueMicrotask(() => {
                _animating = true;
                _timer = setTimeout(() => {
                    _animating = false;
                    _timer = null;
                }, durationMs);
            });
        },
    };
}
