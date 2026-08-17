import type { CooklangRecipe } from '@cooklang/cooklang';
import {TextFileView, WorkspaceLeaf, ViewStateResult} from 'obsidian'
import {CooklangSettings} from './settings';
import {EditorView, keymap, highlightActiveLine, lineNumbers} from "@codemirror/view"
import {EditorState, Extension} from "@codemirror/state"
import {syntaxHighlighting, HighlightStyle} from "@codemirror/language"
import {defaultKeymap} from "@codemirror/commands"
import {cooklang} from './mode/cook/cook'
import {tags as t} from "@lezer/highlight"
import { parserService } from './services/ParserService';
import { TimerService } from './services/TimerService';
import { parseServingsValue, computeScale, deriveServingsState } from './utils/scaling';
import alarmMp3 from './alarm.mp3';
import timerMp3 from './timer.mp3';
import { flushSync, mount, unmount } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import CookViewRoot from './ui/CookViewRoot.svelte';
import { ObsidianRecipeHost } from './ui/ObsidianRecipeHost';
import { createUiInstanceId } from './ui/instanceIds';
import type { CookViewMode, RecipeRenderModel } from './ui/types';
import { availableViewportHeight, caretScrollDelta } from './utils/mobileViewport';

// Use Obsidian's semantic colors so highlighting follows the active theme
// without giving CodeMirror an independent editor surface.
const cooklangHighlightStyle = HighlightStyle.define([
    {tag: t.variableName, color: 'var(--text-accent)'}, // Ingredients (@flour)
    {tag: t.keyword, color: 'var(--color-green)'},      // Cookware (#bowl)
    {tag: t.number, color: 'var(--color-pink)'},        // Timers (~)
    {tag: t.comment, color: 'var(--text-faint)'},       // Comments
    {tag: t.meta, color: 'var(--text-muted)'},          // Metadata and frontmatter
    {tag: t.unit, color: 'var(--color-orange)'},        // Units
]);

// This is the custom view
export class CookView extends TextFileView {
    settings: CooklangSettings;
    sourceEl!: HTMLElement;
    editorView!: EditorView;
    rawRecipe: CooklangRecipe | null = null;
    parserReady: Promise<void>;
    currentView!: CookViewMode;
    timerService: TimerService;
    private modeStore: Writable<CookViewMode>;
    private previewStore: Writable<RecipeRenderModel | null>;
    private svelteRoot: ReturnType<typeof mount>;
    private host: ObsidianRecipeHost;
    private instanceId: string;
    private editorLineWrap: boolean;
    private viewportFrame: number | null = null;
    private removeViewportListeners: (() => void) | null = null;
    data: string = '';
    checkedIngredients: Set<string> = new Set();
    scale: number = 1;
    currentStep: number = -1;

    constructor(leaf: WorkspaceLeaf, settings: CooklangSettings) {
        super(leaf);
        this.settings = settings;
        this.instanceId = createUiInstanceId('cook-view');
        this.host = new ObsidianRecipeHost(this.app);
        this.currentView = this.settings.defaultView === 'preview' ? 'preview' : 'source';
        this.modeStore = writable(this.currentView);
        this.previewStore = writable<RecipeRenderModel | null>(null);
        this.editorLineWrap = this.settings.lineWrap;

        // Initialize parser asynchronously
        this.parserReady = parserService.initialize();

        // Initialize timer service
        this.timerService = new TimerService(
            this.settings,
            {
                tickSoundUrl: timerMp3,
                alarmSoundUrl: alarmMp3,
                tickVolume: 0.3,
                alarmVolume: 0.3
            },
        );

        this.svelteRoot = mount(CookViewRoot, {
            target: this.contentEl,
            props: {
                mode: this.modeStore,
                preview: this.previewStore,
                onSourceReady: (element: HTMLElement) => {
                    this.sourceEl = element;
                },
            },
        });
        flushSync();
        if (!this.sourceEl) throw new Error('Svelte source editor host did not mount.');

        // Initialize the editor using Obsidian's theme colors.
        this.initializeEditor();

        // Set default view (used when a .cook file opens in a fresh leaf, e.g.
        // selecting it in the file tree). A persisted per-leaf mode, if any, is
        // restored later in setState and takes precedence.
        this.setViewMode(this.currentView);
    }

    async onload() {
        super.onload();

        this.initializeViewportTracking();

        // Wait for parser to be ready
        await this.parserReady;
        if (this.currentView === 'preview') this.renderPreview();

        // Add mode toggle button to the action buttons in top right
        this.addAction('book-open', 'Toggle Preview', () => {
            if (this.currentView === 'source') {
                this.setViewMode('preview');
            } else {
                this.setViewMode('source');
            }
        });
    }

    // Initialize CodeMirror editor
    initializeEditor() {
        const extensions: Extension[] = [
            lineNumbers(),
            highlightActiveLine(),
            cooklang, // Our custom Cooklang language support
            syntaxHighlighting(cooklangHighlightStyle),
            keymap.of([
                ...defaultKeymap,  // Include all default editing commands (Enter, Backspace, etc.)
                {
                    key: 'Mod-e',
                    run: () => {
                        this.setViewMode(this.currentView === 'source' ? 'preview' : 'source');
                        return true;
                    }
                }
            ])
        ];

        // Add `EditorView.lineWrapping` if the `lineWrap` setting is enabled.
        if (this.settings.lineWrap) {
            extensions.push(EditorView.lineWrapping);
        }
        this.editorLineWrap = this.settings.lineWrap;

        this.editorView = new EditorView({
            state: EditorState.create({
                doc: this.data,
                extensions
            }),
            parent: this.sourceEl
        });
    }

    private initializeViewportTracking(): void {
        const visualViewport = window.visualViewport;
        const handleViewportChange = () => this.queueViewportUpdate();

        window.addEventListener('resize', handleViewportChange);
        visualViewport?.addEventListener('resize', handleViewportChange);
        visualViewport?.addEventListener('scroll', handleViewportChange);
        this.removeViewportListeners = () => {
            window.removeEventListener('resize', handleViewportChange);
            visualViewport?.removeEventListener('resize', handleViewportChange);
            visualViewport?.removeEventListener('scroll', handleViewportChange);
        };
        this.queueViewportUpdate();
    }

    private queueViewportUpdate(): void {
        if (this.viewportFrame !== null) cancelAnimationFrame(this.viewportFrame);
        this.viewportFrame = requestAnimationFrame(() => {
            this.viewportFrame = null;
            this.updateSourceViewportHeight();
        });
    }

    private updateSourceViewportHeight(): void {
        const visualViewport = window.visualViewport;
        if (!visualViewport || this.currentView !== 'source') return;

        const containerHeight = this.contentEl.clientHeight;
        if (containerHeight <= 0) return;

        // Mobile WebViews keep the layout viewport tall while the keyboard
        // reduces the visual viewport. Size the editor to the actually visible
        // portion so CodeMirror scrolls the caret above the keyboard.
        const height = availableViewportHeight(
            this.sourceEl.getBoundingClientRect().top,
            containerHeight,
            visualViewport,
        );
        const value = `${height}px`;
        if (this.sourceEl.style.getPropertyValue('--cook-source-viewport-height') !== value) {
            this.sourceEl.style.setProperty('--cook-source-viewport-height', value);
        }

        // CodeMirror scrolls the selection before iOS finishes opening the
        // keyboard. Once the visual viewport settles, its old scroll position
        // can leave the caret below the newly shortened editor. Measure after
        // applying the height and correct the editor's own scroll container.
        this.editorView.requestMeasure({
            read: (view) => {
                if (!view.hasFocus) return 0;
                const caret = view.coordsAtPos(view.state.selection.main.head);
                if (!caret) return 0;

                const sourceBounds = this.sourceEl.getBoundingClientRect();
                const viewportTop = Math.max(sourceBounds.top, visualViewport.offsetTop);
                const viewportBottom = Math.min(
                    sourceBounds.bottom,
                    visualViewport.offsetTop + visualViewport.height,
                );
                return caretScrollDelta(
                    caret.top,
                    caret.bottom,
                    viewportTop,
                    viewportBottom,
                );
            },
            write: (delta, view) => {
                if (delta !== 0) view.scrollDOM.scrollTop += delta;
            },
            key: 'cook-mobile-caret',
        });
    }

    setViewMode(mode: CookViewMode) {
        this.currentView = mode;
        this.modeStore.set(mode);
        if (mode === 'preview') this.renderPreview();
        else {
            this.editorView.requestMeasure();
            this.queueViewportUpdate();
        }
    }

    switchMode() {
        this.setViewMode(this.currentView === 'source' ? 'preview' : 'source');
    }

    onunload() {
        this.removeViewportListeners?.();
        this.removeViewportListeners = null;
        if (this.viewportFrame !== null) cancelAnimationFrame(this.viewportFrame);
        this.viewportFrame = null;
        if (this.editorView) {
            this.editorView.destroy();
        }
        // Clean up timer service
        if (this.timerService) {
            this.timerService.dispose();
        }
        // Clear checked ingredients state
        this.checkedIngredients.clear();
        void unmount(this.svelteRoot);
    }

    onPaneMenu(menu: any, source: string) {
        super.onPaneMenu(menu, source);

        menu.addItem((item: any) => {
            item
                .setTitle(this.currentView === 'source' ? 'Show Preview' : 'Show Source')
                .setIcon(this.currentView === 'source' ? 'book-open' : 'edit')
                .onClick(() => {
                    this.setViewMode(this.currentView === 'source' ? 'preview' : 'source');
                });
        });
    }

    onMoreOptionsMenu(menu: any) {
        menu.addItem((item: any) => {
            item
                .setTitle('Toggle Source/Preview')
                .setIcon('book-open')
                .onClick(() => {
                    this.setViewMode(this.currentView === 'source' ? 'preview' : 'source');
                });
        });
    }

    private reinitializeEditor() {
        const currentDoc = this.editorView.state.doc.toString();
        this.editorView.destroy();
        this.data = currentDoc;
        this.initializeEditor();
    }

    // get the data for save
    getViewData() {
        this.data = this.editorView.state.doc.toString();
        // Parse the recipe if parser is ready
        if (parserService.isReady()) {
            const [rawRecipe, report] = parserService.parse(this.data);
            this.rawRecipe = rawRecipe;
        }
        return this.data;
    }

    // load the data into the view
    async setViewData(data: string, clear: boolean) {
        this.data = data;

        if (clear) {
            this.editorView.dispatch({
                changes: {
                    from: 0,
                    to: this.editorView.state.doc.length,
                    insert: data
                }
            });
        } else {
            this.editorView.dispatch({
                changes: {
                    from: 0,
                    to: this.editorView.state.doc.length,
                    insert: data
                }
            });
        }

        // Parse the recipe
        if (parserService.isReady()) {
            const [rawRecipe, report] = parserService.parse(this.data);
            this.rawRecipe = rawRecipe;
        }
        // if we're in preview view, also render that
        if (this.currentView === 'preview') this.renderPreview();
    }

    // clear the editor, etc
    clear() {
        this.previewStore.set(null);
        this.editorView.dispatch({
            changes: {
                from: 0,
                to: this.editorView.state.doc.length,
                insert: ''
            }
        });
        this.data = '';
        this.scale = 1;
        this.currentStep = -1;
        this.checkedIngredients.clear();
    }

    getDisplayText() {
        if (this.file) return this.file.basename;
        else return "Cooklang (no file)";
    }

    canAcceptExtension(extension: string) {
        return extension === 'cook';
    }

    getViewType() {
        return "cook";
    }

    // Override to save the current mode in view state
    getState() {
        const state = super.getState();
        return {
            ...state,
            mode: this.currentView,
            scale: this.scale,
            currentStep: this.currentStep,
        };
    }

    // Override to restore the mode from view state
    async setState(state: any, result: ViewStateResult) {
        await super.setState(state, result);
        if (typeof state.scale === 'number' && state.scale > 0) this.scale = state.scale;
        if (typeof state.currentStep === 'number') this.currentStep = state.currentStep;

        // If a mode was specified in the state, switch to that mode
        if (state.mode && (state.mode === 'source' || state.mode === 'preview')) {
            // Use setTimeout to ensure the view is fully loaded first
            setTimeout(() => {
                this.setViewMode(state.mode);
            }, 10);
        }

        return;
    }

    // when the view is resized, refresh CodeMirror
    onResize() {
        this.editorView.requestMeasure();
        this.queueViewportUpdate();
    }

    getIcon() {
        return "document-cook";
    }

    // render the preview view
    renderPreview() {
        if (!parserService.isReady()) return;

        // Re-parse at the current scale so quantities (list + inline) rescale.
        const [rawRecipe] = parserService.parse(this.data, this.scale);
        this.rawRecipe = rawRecipe;

        // The parser scales (and rounds) the `servings` metadata, so the servings
        // on `rawRecipe` already reflect `this.scale`. Read the unscaled base from
        // a scale-1 parse to compute scale targets and the displayed count
        // correctly (see issue #83).
        const [baseRecipe] = parserService.parse(this.data);
        const { baseServings, displayServings } = deriveServingsState(
            parseServingsValue(baseRecipe.servings),
            this.scale,
        );

        this.previewStore.set({
            instanceId: this.instanceId,
            interactive: true,
            recipe: rawRecipe,
            file: this.file,
            settings: this.settings,
            host: this.host,
            timers: this.timerService,
            state: {
                scale: this.scale,
                baseServings,
                displayServings,
                checkedIngredients: this.checkedIngredients,
                currentStep: this.currentStep,
            },
            callbacks: {
                onScaleChange: (targetServings: number) => {
                    if (baseServings == null) return;
                    this.scale = computeScale(targetServings, baseServings);
                    this.renderPreview();
                },
                onIngredientToggle: (ingredientName: string) => {
                    if (this.checkedIngredients.has(ingredientName)) {
                        this.checkedIngredients.delete(ingredientName);
                    } else {
                        this.checkedIngredients.add(ingredientName);
                    }
                    this.renderPreview();
                },
                onStepActivate: (index: number) => {
                    this.currentStep = this.currentStep === index ? -1 : index;
                    this.renderPreview();
                },
            },
        });
    }

    updateSettings(settings: CooklangSettings): void {
        const lineWrapChanged = this.editorLineWrap !== settings.lineWrap;
        this.settings = settings;
        if (lineWrapChanged) this.reinitializeEditor();
        if (this.currentView === 'preview') this.renderPreview();
    }
}
