/**
 * Pure servings-scaling math used by the scaler bar and CookView.
 */

// `@cooklang/cooklang` does not re-export its `Servings` type, so mirror it
// locally (it is `number | string`).
type Servings = number | string;

export interface RecipeReferenceScaleRequest {
    quantity: number;
    unit: string | null;
}

/** Numeric base servings from recipe metadata, defaulting to one when omitted. */
export function parseServingsValue(servings: Servings | undefined): number | null {
    if (servings === undefined) return 1;
    if (typeof servings === 'number') {
        return servings > 0 ? servings : null;
    }
    if (typeof servings === 'string') {
        const match = servings.match(/^\s*(\d+(?:\.\d+)?)/);
        if (match) {
            const n = parseFloat(match[1]);
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

interface ParsedYield {
    quantity: number;
    unit: string;
}

function parseYieldValue(value: unknown): ParsedYield | null {
    if (typeof value !== 'string') return null;
    const match = value.match(/^\s*(\d+(?:\.\d+)?)\s*(?:%|\s)\s*(\S.*?)\s*$/);
    if (!match) return null;
    const quantity = Number(match[1]);
    return quantity > 0
        ? { quantity, unit: match[2].trim() }
        : null;
}

function normalizedUnit(unit: string): string {
    return unit.trim().toLowerCase().replace(/s$/, '');
}

/** Resolve a reference quantity to the scale factor for the target recipe. */
export function computeReferenceScale(
    request: RecipeReferenceScaleRequest | null,
    servings: Servings | undefined,
    yieldValue: unknown,
): number {
    if (!request || !Number.isFinite(request.quantity) || request.quantity <= 0) return 1;
    if (!request.unit?.trim()) return request.quantity;

    if (normalizedUnit(request.unit) === 'serving') {
        const baseServings = parseServingsValue(servings);
        return baseServings === null ? 1 : computeScale(request.quantity, baseServings);
    }

    const parsedYield = parseYieldValue(yieldValue);
    return parsedYield && normalizedUnit(parsedYield.unit) === normalizedUnit(request.unit)
        ? request.quantity / parsedYield.quantity
        : 1;
}

/** Clamp a servings count within sane bounds without discarding fractions. */
export function clampServings(value: number, min = 1, max = 1000): number {
    return Math.max(min, Math.min(max, value));
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
