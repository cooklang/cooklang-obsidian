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
