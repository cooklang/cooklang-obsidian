/**
 * Pure helpers for matching Cooklang per-step images.
 *
 * Convention (https://cooklang.org/docs/conventions/): a step image is a sibling
 * file named "<recipeBasename>.<stepNumber>.<ext>" where stepNumber is the
 * 1-based position of the step across the whole recipe (the first step's image
 * ends in ".1"). The main/title image is "<recipeBasename>.<ext>" with no
 * numeric suffix.
 *
 * Generic over a minimal { basename, extension } shape so this stays free of
 * the Obsidian runtime and unit-testable.
 */
export interface ImageLike {
    basename: string;
    extension: string;
}

/**
 * Returns the 1-based step number encoded in an image basename, or null if the
 * basename is not a "<recipeBasename>.<digits>" step image.
 */
export function extractStepNumber(imageBasename: string, recipeBasename: string): number | null {
    const prefix = recipeBasename + '.';
    if (!imageBasename.startsWith(prefix)) return null;
    const suffix = imageBasename.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return null;
    return parseInt(suffix, 10);
}

export function getStepImageFor<T extends ImageLike>(
    stepNumber: number,
    recipeBasename: string,
    images: T[],
): T | null {
    for (const image of images) {
        if (extractStepNumber(image.basename, recipeBasename) === stepNumber) {
            return image;
        }
    }
    return null;
}
