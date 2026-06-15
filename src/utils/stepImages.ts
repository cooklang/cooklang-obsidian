/**
 * Pure helpers for matching Cooklang per-step images.
 *
 * Convention (https://cooklang.org/docs/spec/#adding-pictures): a step image is
 * a sibling file named "<recipeBasename>.<stepIndex>.<ext>" where stepIndex is
 * the 0-based position of the step across the whole recipe. The main/title
 * image is "<recipeBasename>.<ext>" with no numeric suffix.
 *
 * Generic over a minimal { basename, extension } shape so this stays free of
 * the Obsidian runtime and unit-testable.
 */
export interface ImageLike {
    basename: string;
    extension: string;
}

/**
 * Returns the 0-based step index encoded in an image basename, or null if the
 * basename is not a "<recipeBasename>.<digits>" step image.
 */
export function extractStepIndex(imageBasename: string, recipeBasename: string): number | null {
    const prefix = recipeBasename + '.';
    if (!imageBasename.startsWith(prefix)) return null;
    const suffix = imageBasename.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return null;
    return parseInt(suffix, 10);
}

export function getStepImageFor<T extends ImageLike>(
    stepIndex: number,
    recipeBasename: string,
    images: T[],
): T | null {
    for (const image of images) {
        if (extractStepIndex(image.basename, recipeBasename) === stepIndex) {
            return image;
        }
    }
    return null;
}
