/**
 * Returns a clone of the user's settings with the flags that don't make sense
 * for an embedded `cook` block forced off, leaving everything else inherited.
 *
 * Embedded blocks render compact and read-only: no two-column layout, no live
 * timers, no tap-to-track step state, and no per-step image lookup. The input
 * is spread (not mutated) so the shared plugin settings object is untouched.
 *
 * Type-only import of CooklangSettings keeps this node-testable (no `obsidian`
 * runtime dependency), matching the duck-typed pattern in quantityValue.ts.
 */
import type { CooklangSettings } from '../settings';

export function embedSettings(base: CooklangSettings): CooklangSettings {
    return {
        ...base,
        enableStepTracking: false,
        showTimersInline: false,
        twoColumnLayout: false,
        showImages: false,
    };
}
