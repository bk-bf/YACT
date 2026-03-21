/**
 * useHoverGlow — lightweight hover-state composable for Svelte 5
 *
 * Tracks which element id is currently hovered, enabling reactive CSS
 * class binding for glow / highlight effects without inline event handlers
 * scattered across templates.
 *
 * Usage:
 *
 *   const hover = createHoverGlow();
 *
 *   In the template:
 *     <span
 *       class={hover.isActive('btc-price') ? 'hover-glow-active' : ''}
 *       onmouseenter={() => hover.enter('btc-price')}
 *       onmouseleave={() => hover.leave('btc-price')}
 *     >$70,000</span>
 *
 * The CSS classes 'hover-glow-active', 'hover-glow-positive', 'hover-glow-negative'
 * are defined in application-shell.css.
 */

export function createHoverGlow() {
    let _active = $state<string | null>(null);

    return {
        /** The id currently being hovered, or null. */
        get active(): string | null { return _active; },
        /** Returns true if the given id is currently hovered. */
        isActive(id: string): boolean { return _active === id; },
        /** Call on mouseenter with any stable id string. */
        enter(id: string): void { _active = id; },
        /** Call on mouseleave. */
        leave(_id?: string): void { _active = null; },
    };
}
