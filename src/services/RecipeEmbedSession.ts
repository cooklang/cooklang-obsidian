import type { CooklangRecipe } from '@cooklang/cooklang';
import type { EmbedRenderState, RecipeRenderModel } from '../ui/types';

export interface RecipeEmbedHost {
    read(): Promise<string>;
    initialize(): Promise<void>;
    parse(source: string): CooklangRecipe;
    model(recipe: CooklangRecipe): RecipeRenderModel;
    publish(state: EmbedRenderState): void;
}

/** A removed embed or an older async parse must never replace a newer render. */
export class RecipeEmbedSession {
    private revision = 0;
    private disposed = false;

    constructor(private host: RecipeEmbedHost) {}

    async refresh(): Promise<void> {
        if (this.disposed) return;
        const revision = ++this.revision;
        const publish = (state: EmbedRenderState) => {
            if (!this.disposed && this.revision === revision) this.host.publish(state);
        };
        publish({ status: 'loading' });
        let source = '';
        let message = 'Could not read this recipe.';
        try {
            source = await this.host.read();
            if (!source.trim()) {
                publish({ status: 'empty' });
                return;
            }
            message = 'Cooklang parser failed to load.';
            await this.host.initialize();
            if (this.disposed || this.revision !== revision) return;
            message = 'Could not parse this recipe.';
            const recipe = this.host.parse(source);
            publish({ status: 'ready', model: this.host.model(recipe) });
        } catch {
            publish({ status: 'error', source, message });
        }
    }

    dispose(): void { this.disposed = true; this.revision++; }
}
