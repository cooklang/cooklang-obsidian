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
        const folder = sourceFile?.parent?.path ?? '';
        const normalizedFolder = folder === '/' ? '' : folder;
        const [cookPath, markdownPath] = resolveReferenceCandidatePaths(
            normalizedFolder,
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
            }
            : null;
    }

    openReference(reference: ResolvedRecipeReference): void {
        this.app.workspace.openLinkText(reference.targetPath, reference.sourcePath, false);
    }
}
