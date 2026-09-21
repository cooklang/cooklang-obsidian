import { TextFileView, WorkspaceLeaf, type ViewStateResult, type Menu, Scope } from 'obsidian';
import type { CooklangSettings } from './settings';
import { parserService } from './services/ParserService';
import type { RecipeSession } from './services/RecipeSessions';
import { parseServingsValue, computeScale, computeReferenceScale, deriveServingsState,
    type RecipeReferenceScaleRequest } from './utils/scaling';
import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';
import CookViewRoot from './ui/CookViewRoot.svelte';
import type { RecipeHostAdapter, RecipeRenderModel } from './ui/types';
import { recipeName } from './utils/recipeFiles';

/** Interactive preview only. Obsidian owns every source editor. */
export class CookView extends TextFileView {
    private previewStore = writable<RecipeRenderModel | null>(null);
    private component: ReturnType<typeof mount>;
    private disposed = false;
    private currentSession: RecipeSession | null = null;

    constructor(leaf: WorkspaceLeaf, private settings: CooklangSettings,
        private acquireSession: (path: string) => RecipeSession,
        private editSource: (leaf: WorkspaceLeaf) => Promise<void>,
        private host: RecipeHostAdapter) {
        super(leaf);
        this.component = mount(CookViewRoot, { target: this.contentEl, props: { preview: this.previewStore } });
        this.scope = new Scope(this.app.scope);
        this.scope.register(['Mod'], 'e', () => { void this.editSource(this.leaf); return false; });
    }

    private get session(): RecipeSession | null {
        this.currentSession = this.file ? this.acquireSession(this.file.path) : null;
        return this.currentSession;
    }

    async onload(): Promise<void> {
        super.onload();
        this.addAction('edit-3', 'Edit recipe source', () => { void this.editSource(this.leaf); });
        await parserService.initialize();
        if (!this.disposed) this.renderPreview();
    }

    onunload(): void {
        this.disposed = true;
        void unmount(this.component);
        // The plugin's session registry owns timers and checklist state.
    }

    onPaneMenu(menu: Menu, source: string): void {
        super.onPaneMenu(menu, source);
        menu.addItem(item => item.setTitle('Edit recipe source').setIcon('file-pen')
            .onClick(() => this.editSource(this.leaf)));
    }

    getViewData(): string { return this.data ?? ''; }

    setViewData(data: string, clear: boolean): void {
        if (clear) this.previewStore.set(null);
        this.data = data;
        this.renderPreview();
    }

    clear(): void {
        this.previewStore.set(null);
        this.data = '';
        this.currentSession = null;
    }

    getDisplayText(): string { return this.file ? recipeName(this.file.path) : 'Cooklang (no file)'; }
    // New navigation must go through the registered native view and routing policy.
    // Otherwise Obsidian reuses this preview for unrelated Markdown notes.
    canAcceptExtension(_extension: string): boolean { return false; }
    getViewType(): string { return 'cook'; }
    getIcon(): string { return 'document-cook'; }

    getState(): Record<string, unknown> {
        const session = this.currentSession;
        return { ...super.getState(), mode: 'preview', scale: session?.scale ?? 1,
            currentStep: session?.currentStep ?? -1 };
    }

    async setState(state: Record<string, unknown>, result: ViewStateResult): Promise<void> {
        await super.setState(state, result);
        if (this.disposed) return;
        const session = this.session;
        if (session) {
            if (typeof state.scale === 'number' && Number.isFinite(state.scale) && state.scale > 0) session.scale = state.scale;
            if (typeof state.currentStep === 'number' && Number.isInteger(state.currentStep)) session.currentStep = state.currentStep;
            if (isReferenceScaleRequest(state.referenceScale)) session.pendingReferenceScale = state.referenceScale;
        }
        // Migrate previously persisted standalone source editors after setState completes.
        if (state.mode === 'source') {
            const file = this.file;
            window.setTimeout(() => {
                if (!this.disposed && this.file === file) void this.editSource(this.leaf);
            }, 0);
            return;
        }
        this.renderPreview();
    }

    renderPreview(): void {
        if (this.disposed || typeof this.data !== 'string' || !parserService.isReady()) return;
        const session = this.session;
        if (!session) return;
        let [recipe] = parserService.parse(this.data, session.scale);
        const [baseRecipe] = parserService.parse(this.data);
        if (session.pendingReferenceScale) {
            session.scale = computeReferenceScale(session.pendingReferenceScale,
                baseRecipe.servings, baseRecipe.rawMetadata.get('yield'));
            session.pendingReferenceScale = null;
            [recipe] = parserService.parse(this.data, session.scale);
        }
        const { baseServings, displayServings } = deriveServingsState(
            parseServingsValue(baseRecipe.servings), session.scale);
        this.previewStore.set({
            instanceId: session.instanceId, interactive: true, recipe, file: this.file,
            settings: this.settings, host: this.host, timers: session.timers,
            state: { scale: session.scale, baseServings, displayServings,
                checkedIngredients: session.checkedIngredients, currentStep: session.currentStep },
            callbacks: {
                onScaleChange: target => {
                    if (baseServings == null) return;
                    session.scale = computeScale(target, baseServings);
                    this.renderPreview();
                },
                onIngredientToggle: name => {
                    if (session.checkedIngredients.has(name)) session.checkedIngredients.delete(name);
                    else session.checkedIngredients.add(name);
                    this.renderPreview();
                },
                onStepActivate: index => {
                    session.currentStep = session.currentStep === index ? -1 : index;
                    this.renderPreview();
                },
            },
        });
    }

    updateSettings(settings: CooklangSettings): void {
        this.settings = settings;
        this.renderPreview();
    }
}

function isReferenceScaleRequest(value: unknown): value is RecipeReferenceScaleRequest {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<RecipeReferenceScaleRequest>;
    return typeof candidate.quantity === 'number' && Number.isFinite(candidate.quantity)
        && (typeof candidate.unit === 'string' || candidate.unit === null);
}
