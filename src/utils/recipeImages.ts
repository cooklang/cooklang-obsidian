/**
 * Normalizes the Cooklang parser's loosely typed canonical image metadata.
 * The specification permits either one URL or an array of URLs.
 */
import { getSafeExternalUrl } from './urlValidators';

export function getRecipeImageUrls(value: unknown): string[] {
    const candidates = Array.isArray(value) ? value : [value];

    return candidates.flatMap(candidate => {
        const url = getSafeExternalUrl(candidate);
        return url ? [url] : [];
    });
}
