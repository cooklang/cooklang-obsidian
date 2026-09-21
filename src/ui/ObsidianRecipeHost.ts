import { App, TFile, WorkspaceLeaf } from 'obsidian';
import type { RecipeRefTarget } from '../utils/ingredientAggregator';
import { resolveReferenceCandidatePaths } from '../utils/recipeReferences';
import { isRecipeFile } from '../utils/recipeFiles';
import type {
    RecipeHostAdapter,
    ResolvedRecipeReference,
} from './types';

export class ObsidianRecipeHost implements RecipeHostAdapter {
    constructor(private app: App, private onOpenRecipe?: (leaf: WorkspaceLeaf, reference: ResolvedRecipeReference) => void) {}

    getResourcePath(file: TFile): string {
        return this.app.vault.getResourcePath(file);
    }

    resolveReference(
        sourceFile: TFile | null,
        ref: RecipeRefTarget,
    ): ResolvedRecipeReference | null {
        const candidates = resolveReferenceCandidatePaths(
            '',
            ref.components ?? [],
            ref.name,
        );
        const target = candidates.map(path => this.app.vault.getAbstractFileByPath(path))
            .find((file): file is TFile => file instanceof TFile
                && isRecipeFile(file.path, this.app.metadataCache.getFileCache(file)?.frontmatter));

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
        if (this.onOpenRecipe) {
            this.onOpenRecipe(leaf, reference);
            return;
        }
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
