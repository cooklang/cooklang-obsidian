import { App, TFile } from 'obsidian';
import type { RecipeRefTarget } from '../utils/ingredientAggregator';
import { resolveReferenceCandidatePaths } from '../utils/recipeReferences';
import type {
    RecipeHostAdapter,
    ResolvedRecipeReference,
} from './types';

export class ObsidianRecipeHost implements RecipeHostAdapter {
    constructor(private app: App) {}

    getResourcePath(file: TFile): string {
        return this.app.vault.getResourcePath(file);
    }

    resolveReference(
        sourceFile: TFile | null,
        ref: RecipeRefTarget,
    ): ResolvedRecipeReference | null {
        const [cookPath, markdownPath] = resolveReferenceCandidatePaths(
            '',
            ref.components ?? [],
            ref.name,
        );
        const cookTarget = this.app.vault.getAbstractFileByPath(cookPath);
        const markdownTarget = this.app.vault.getAbstractFileByPath(markdownPath);
        const target = cookTarget instanceof TFile
            ? cookTarget
            : markdownTarget instanceof TFile
                && this.app.metadataCache.getFileCache(markdownTarget)?.frontmatter?.recipe === true
                ? markdownTarget
                : null;

        return target
            ? {
                targetPath: target.path,
                sourcePath: sourceFile?.path ?? '',
                scaleRequest: ref.quantity !== null && ref.quantity > 0
                    ? { quantity: ref.quantity, unit: ref.unit }
                    : null,
            }
            : null;
    }

    openReference(reference: ResolvedRecipeReference): void {
        const leaf = this.app.workspace.getLeaf(false);
        void leaf.setViewState({
            type: 'cook',
            state: {
                file: reference.targetPath,
                mode: 'preview',
                referenceScale: reference.scaleRequest,
            },
        });
    }
}
