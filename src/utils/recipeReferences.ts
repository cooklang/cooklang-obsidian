/**
 * Pure resolution of Cooklang recipe references to a vault path.
 *
 * A reference like `@./Components/Beans` parses to
 * { name: "Beans", components: [".", "Components"] }. The components are a path
 * relative to the referencing recipe's own folder; "." stays, ".." goes up.
 * This resolves that to a concrete `<...>.cook` vault path.
 */

/**
 * Resolve a reference to a `.cook` vault path, relative to the folder of the
 * recipe that contains the reference.
 *
 * @param recipeFolder - Vault path of the referencing recipe's folder ('' = root)
 * @param components - Reference path components (e.g. [".", "Components"])
 * @param name - Referenced recipe name (e.g. "Beans")
 * @returns Normalised vault path like "Breakfast/Components/Beans.cook"
 */
export function resolveReferencePath(
    recipeFolder: string,
    components: string[],
    name: string,
): string {
    const segments = recipeFolder ? recipeFolder.split('/').filter(Boolean) : [];

    for (const component of components) {
        if (component === '' || component === '.') continue;
        if (component === '..') {
            segments.pop();
        } else {
            segments.push(component);
        }
    }
    segments.push(name);

    return segments.join('/') + '.cook';
}
