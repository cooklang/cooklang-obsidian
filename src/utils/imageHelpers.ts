/**
 * Image detection and handling utilities for recipe files
 */

import { TFile } from 'obsidian';

/**
 * Supported image extensions following Cooklang conventions
 * https://cooklang.org/docs/spec/#adding-pictures
 */
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/**
 * Checks if a file extension is a supported image format
 * @param extension - File extension (without dot)
 * @returns true if the extension is a supported image format
 *
 * @example
 * isImageExtension('jpg') // true
 * isImageExtension('png') // true
 * isImageExtension('txt') // false
 */
export function isImageExtension(extension: string): boolean {
    return IMAGE_EXTENSIONS.includes(extension.toLowerCase());
}

/**
 * Finds recipe-related image files following Cooklang conventions
 * - Main image: same basename as recipe file (e.g., recipe.jpg for recipe.cook)
 * - Step images: basename with suffix (e.g., recipe.step1.jpg)
 *
 * @param recipeFile - The recipe TFile
 * @returns Object containing main image if found, and array of all related images
 *
 * @example
 * const { mainImage, allImages } = findRecipeImages(recipeFile);
 * if (mainImage) {
 *   // Display main image
 * }
 */
export function findRecipeImages(recipeFile: TFile | null): {
    mainImage: TFile | null;
    allImages: TFile[];
} {
    if (!recipeFile || !recipeFile.parent) {
        return { mainImage: null, allImages: [] };
    }

    // Get all files in the same directory
    const otherFiles = recipeFile.parent.children.filter(
        f => f instanceof TFile &&
            (f.basename === recipeFile.basename || f.basename.startsWith(recipeFile.basename + '.')) &&
            f.name !== recipeFile.name
    ) as TFile[];

    // Filter for image files
    const imageFiles = otherFiles.filter(f => isImageExtension(f.extension));

    // Find main image (exact basename match)
    const mainImage = imageFiles.find(f => f.basename === recipeFile.basename) ?? null;

    return {
        mainImage,
        allImages: imageFiles
    };
}
