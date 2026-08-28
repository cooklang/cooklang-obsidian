/**
 * URL validation utilities
 */

/** Return a normalized HTTP(S) URL that is safe to expose as an external link. */
export function getSafeExternalUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const candidate = value.trim();
    if (!candidate) return null;

    try {
        const url = new URL(candidate);
        return url.protocol === 'http:' || url.protocol === 'https:'
            ? candidate
            : null;
    } catch {
        return null;
    }
}
