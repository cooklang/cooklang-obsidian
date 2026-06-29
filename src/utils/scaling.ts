/**
 * Pure servings-scaling math used by the scaler bar and CookView.
 */

// `@cooklang/cooklang` does not re-export its `Servings` type, so mirror it
// locally (it is `number | string`).
type Servings = number | string;

/** Numeric base servings from recipe metadata, or null if not derivable. */
export function parseServingsValue(servings: Servings | undefined): number | null {
    if (typeof servings === 'number') {
        return servings > 0 ? servings : null;
    }
    if (typeof servings === 'string') {
        const match = servings.match(/\d+(\.\d+)?/);
        if (match) {
            const n = parseFloat(match[0]);
            if (n > 0) return n;
        }
    }
    return null;
}

/** Scale factor to pass to the parser: target / base. */
export function computeScale(targetServings: number, baseServings: number): number {
    if (baseServings <= 0) return 1;
    return targetServings / baseServings;
}

/** Round to an integer servings count within sane bounds. */
export function clampServings(value: number, min = 1, max = 1000): number {
    return Math.max(min, Math.min(max, Math.round(value)));
}

export interface ServingsState {
    /** Unscaled base servings from recipe metadata, or null when not numeric. */
    baseServings: number | null;
    /** Servings shown to the user at the current scale, or null when no base. */
    displayServings: number | null;
}

/**
 * Derive the servings shown in the scaler from the UNSCALED base servings and
 * the current scale.
 *
 * `baseServings` must come from a scale-1 parse: the Cooklang parser scales (and
 * rounds) the `servings` metadata, so reading servings off a recipe parsed at
 * `scale` and multiplying by `scale` again squares the factor — the bug behind
 * issue #83 (×4 only doubled quantities, and targets like ×2/×6 were skipped).
 */
export function deriveServingsState(baseServings: number | null, scale: number): ServingsState {
    if (baseServings == null) return { baseServings: null, displayServings: null };
    return { baseServings, displayServings: clampServings(baseServings * scale) };
}
