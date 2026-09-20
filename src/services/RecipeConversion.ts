import { convertRecipeContent, recipeConversionPath, type RecipeFormat, type YamlCodec } from '../utils/recipeFiles';

export interface ConversionHost {
    path(): string;
    exists(path: string): boolean;
    save(): Promise<void>;
    read(): Promise<string>;
    process(update: (current: string) => string): Promise<void>;
    synchronize(previous: string, next: string): Promise<void>;
    rename(path: string): Promise<void>;
    refreshMetadata(): Promise<void>;
}

/** Host operations are injected so failure and concurrent-edit behavior is testable. */
export async function convertRecipe(host: ConversionHost, target: RecipeFormat, yaml: YamlCodec): Promise<void> {
    const originalPath = host.path();
    const destination = recipeConversionPath(originalPath, target);
    if (originalPath === destination) return;
    if (host.exists(destination)) throw new Error(`A file already exists at ${destination}.`);
    await host.save();
    const source = await host.read();
    const converted = convertRecipeContent(source, target, yaml);
    if (host.path() !== originalPath) throw new Error('The recipe was renamed during conversion. Please try again.');
    if (host.exists(destination)) throw new Error(`A file already exists at ${destination}.`);
    if (converted !== source) {
        await host.process(current => {
            if (current !== source) throw new Error('The recipe changed during conversion. Please try again.');
            return converted;
        });
        // Prevent an already-open editor from saving its old frontmatter back.
        await host.synchronize(source, converted);
    }
    // Do not roll back content on failure: another editor may already have changed it.
    if (host.path() !== originalPath) throw new Error('The recipe was renamed during conversion.');
    if (host.exists(destination)) throw new Error(`A file already exists at ${destination}.`);
    await host.rename(destination);
    // Renaming a non-Markdown file does not necessarily enqueue a Markdown
    // parse. Refresh after the extension changes, even if its text was unchanged.
    if (target !== 'cook') {
        if (host.path() !== destination) throw new Error('The recipe was renamed during conversion.');
        await host.refreshMetadata();
    }
}

export interface RecipeBuffer {
    read(): string;
    replace(content: string): void | Promise<void>;
}

export async function synchronizeRecipeBuffers(buffers: RecipeBuffer[], previous: string, next: string): Promise<void> {
    for (const buffer of buffers) {
        const content = buffer.read();
        if (content !== previous && content !== next) {
            throw new Error('An open editor changed during conversion. Please save it and try again.');
        }
    }
    for (const buffer of buffers) {
        const content = buffer.read();
        if (content === next) continue;
        if (content !== previous) throw new Error('An open editor changed during conversion. Please try again.');
        await buffer.replace(next);
    }
}
