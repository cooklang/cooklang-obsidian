import { App, MarkdownRenderChild, TFile } from 'obsidian';
import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';
import RecipeEmbed from './RecipeEmbed.svelte';
import type { CooklangSettings } from '../settings';
import type { EmbedRenderState, RecipeHostAdapter } from './types';
import { parserService } from '../services/ParserService';
import { RecipeEmbedSession } from '../services/RecipeEmbedSession';
import { embedSettings } from '../utils/embedSettings';
import { isRecipeFile } from '../utils/recipeFiles';
import { createUiInstanceId } from './instanceIds';

export class RecipeEmbedChild extends MarkdownRenderChild {
    private session: RecipeEmbedSession;
    private component: ReturnType<typeof mount>;

    constructor(
        container: HTMLElement,
        target: HTMLElement,
        private app: App,
        private file: TFile | null,
        settings: () => CooklangSettings,
        host: RecipeHostAdapter,
        private source?: string,
        private cleanup: () => void = () => {},
    ) {
        super(container);
        const renderState = writable<EmbedRenderState>({ status: 'loading' });
        const instanceId = createUiInstanceId('cook-embed');
        this.component = mount(RecipeEmbed, {
            target,
            props: { renderState, wholeNote: source === undefined },
        });
        this.session = new RecipeEmbedSession({
            read: () => source !== undefined ? Promise.resolve(source)
                : file ? app.vault.read(file) : Promise.reject(new Error('Recipe file is missing.')),
            initialize: () => parserService.initialize(),
            parse: text => parserService.parse(text)[0],
            model: recipe => ({
                instanceId, interactive: false, recipe, file,
                settings: embedSettings(settings()), host, timers: null,
                state: { scale: 1, baseServings: null, displayServings: null,
                    checkedIngredients: new Set<string>(), currentStep: -1 },
                callbacks: { onScaleChange: () => {}, onIngredientToggle: () => {}, onStepActivate: () => {} },
            }),
            publish: state => renderState.set(state),
        });
    }

    refresh(): Promise<void> { return this.session.refresh(); }

    onload(): void {
        if (this.source !== undefined || !this.file) return;
        this.registerEvent(this.app.vault.on('modify', file => {
            if (file === this.file) void this.session.refresh();
        }));
        this.registerEvent(this.app.vault.on('rename', file => {
            if (file === this.file) void this.session.refresh();
        }));
        this.registerEvent(this.app.vault.on('delete', file => {
            if (file === this.file) this.unload();
        }));
        this.registerEvent(this.app.metadataCache.on('changed', (file, _data, cache) => {
            if (file === this.file && !isRecipeFile(file.path, cache.frontmatter)) this.unload();
        }));
    }

    onunload(): void {
        this.session.dispose();
        void unmount(this.component);
        this.cleanup();
    }
}
