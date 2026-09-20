/**
 * Normalizes the Cooklang parser's loosely typed canonical image metadata.
 * The specification permits either one URL or an array of URLs.
 */
import { getSafeExternalUrl } from './urlValidators';
import { recipeImageBasenames } from './recipeFiles';

export function getRecipeMainImage<T extends { basename: string }>(recipePath: string, images: T[]): T | null {
    for (const basename of recipeImageBasenames(recipePath)) {
        const image = images.find(candidate => candidate.basename === basename);
        if (image) return image;
    }
    return null;
}

export function getRecipeImageUrls(value: unknown): string[] {
    const candidates = Array.isArray(value) ? value : [value];

    return candidates.flatMap(candidate => {
        const url = getSafeExternalUrl(candidate);
        return url ? [url] : [];
    });
}
