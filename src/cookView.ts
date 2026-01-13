import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import {TextFileView, setIcon, TFile, Keymap, WorkspaceLeaf, ViewStateResult, Notice} from 'obsidian'
import {CooklangSettings} from './settings';
import {EditorView, keymap, highlightActiveLine, lineNumbers, ViewPlugin} from "@codemirror/view"
import {EditorState, Extension} from "@codemirror/state"
import {syntaxHighlighting, defaultHighlightStyle, HighlightStyle} from "@codemirror/language"
import {oneDark} from "@codemirror/theme-one-dark"
import {defaultKeymap} from "@codemirror/commands"
import {cooklang} from './mode/cook/cook'
import {tags as t} from "@lezer/highlight"
import {string} from "postcss-selector-parser";
import { parserService } from './services/ParserService';
import { TimerService } from './services/TimerService';
import { PreviewRenderer } from './renderers/PreviewRenderer';
import alarmMp3 from './alarm.mp3';
import timerMp3 from './timer.mp3';

// Define a light theme HighlightStyle for Cooklang
const cooklangLightTheme = HighlightStyle.define([
    {tag: t.variableName, color: "#0b76b8"},  // Ingredients (@flour)
    {tag: t.keyword, color: "#33a058"},       // Cookware (#bowl)
    {tag: t.number, color: "#d33682"},        // Timers (~)
    {tag: t.comment, color: "#93a1a1"},       // Comments
    {tag: t.meta, color: "#6c71c4"},          // Metadata and frontmatter
    {tag: t.unit, color: "#cb4b16"}           // Units
])

// This is the custom view
export class CookView extends TextFileView {
    settings: CooklangSettings;
    previewEl: HTMLElement;
    sourceEl: HTMLElement;
    editorView: EditorView;
    rawRecipe: CooklangRecipe | null = null;
    parserReady: Promise<void>;
    changeModeButton: HTMLElement;
    currentView: 'source' | 'preview';
    timerService: TimerService;
    previewRenderer: PreviewRenderer;
    data: string = '';
    checkedIngredients: Set<string> = new Set();

    constructor(leaf: WorkspaceLeaf, settings: CooklangSettings) {
        super(leaf);
        this.settings = settings;

        // Initialize parser asynchronously
        this.parserReady = parserService.initialize();

        // Initialize timer service
        this.timerService = new TimerService({
            tickSoundUrl: timerMp3,
            alarmSoundUrl: alarmMp3,
            tickVolume: 0.3,
            alarmVolume: 0.3
        });

        // Initialize preview renderer
        this.previewRenderer = new PreviewRenderer(
            this.app,
            this.settings,
            this.timerService
        );

        // Add Preview Container
        this.previewEl = this.contentEl.createDiv({cls: 'cook-preview-view'});

        // Add Source Mode Container with padding
        this.sourceEl = this.contentEl.createDiv({
            cls: 'cook-source-view-full',
            attr: {
                'style': 'display: block; padding: 0 20px;'
            }
        });

        // Initialize Editor with proper theme based on Obsidian theme
        this.initializeEditor();

        // Set default view
        this.setViewMode('source'); // Start in source mode by default
    }

    async onload() {
        super.onload();

        // Wait for parser to be ready
        await this.parserReady;

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
        // Determine theme based on Obsidian theme
        const isDark = document.body.classList.contains('theme-dark');

        const extensions: Extension[] = [
            lineNumbers(),
            highlightActiveLine(),
            cooklang, // Our custom Cooklang language support
            EditorView.lineWrapping,
            // Add theme-aware syntax highlighting
            isDark ?
                syntaxHighlighting(defaultHighlightStyle) :
                syntaxHighlighting(cooklangLightTheme),
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

        // Add oneDark theme only in dark mode
        if (isDark) {
            extensions.push(oneDark);
        }

        this.editorView = new EditorView({
            state: EditorState.create({
                doc: this.data,
                extensions
            }),
            parent: this.sourceEl
        });
    }

    setViewMode(mode: 'source' | 'preview') {
        this.currentView = mode;

        if (mode === 'source') {
            this.previewEl.style.display = 'none';
            this.sourceEl.style.display = 'block';
        } else {
            this.sourceEl.style.display = 'none';
            this.previewEl.style.display = 'block';
            // Parse and render the preview
            if (parserService.isReady()) {
                const [rawRecipe, report] = parserService.parse(this.data);
                this.rawRecipe = rawRecipe;
                this.renderPreview();
            }
        }
    }

    switchMode() {
        this.setViewMode(this.currentView === 'source' ? 'preview' : 'source');
    }

    onunload() {
        if (this.editorView) {
            this.editorView.destroy();
        }
        // Clean up timer service
        if (this.timerService) {
            this.timerService.dispose();
        }
        // Clear checked ingredients state
        this.checkedIngredients.clear();
    }

    makeTimer(button: HTMLElement, seconds: number, name: string) {
        this.timerService.attachTimerToButton(button, seconds, name);
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

    // When Obsidian's theme changes, update the editor theme
    onThemeChange() {
        // Recreate the editor with the appropriate theme
        const currentDoc = this.editorView.state.doc.toString();
        this.editorView.destroy();
        this.initializeEditor();
        this.editorView.dispatch({
            changes: {
                from: 0,
                to: 0,
                insert: currentDoc
            }
        });
    }

    async onOpen() {
        // Listen for theme changes
        this.registerEvent(
            this.app.workspace.on('css-change', () => {
                // Check if the theme actually changed
                const wasDark = this.editorView.state.facet(EditorView.darkTheme);
                const isDark = document.body.classList.contains('theme-dark');

                if (wasDark !== isDark) {
                    this.onThemeChange();
                }
            })
        );
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
        this.previewEl.empty();
        this.editorView.dispatch({
            changes: {
                from: 0,
                to: this.editorView.state.doc.length,
                insert: ''
            }
        });
        this.data = '';
    }

    getDisplayText() {
        if (this.file) return this.file.basename;
        else return "Cooklang (no file)";
    }

    canAcceptExtension(extension: string) {
        // Accept both .cook and .md files
        return extension === 'cook' || extension === 'md';
    }

    getViewType() {
        return "cook";
    }

    // Override to save the current mode in view state
    getState() {
        const state = super.getState();
        return {
            ...state,
            mode: this.currentView
        };
    }

    // Override to restore the mode from view state
    async setState(state: any, result: ViewStateResult) {
        await super.setState(state, result);
        
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
    }

    getIcon() {
        return "document-cook";
    }

    // render the preview view
    renderPreview() {
        // we can't render what we don't have...
        if (!this.rawRecipe) return;

        // Delegate to preview renderer with checked ingredients state
        this.previewRenderer.render(
            this.rawRecipe, 
            this.previewEl, 
            this.file,
            this.checkedIngredients,
            () => this.renderPreview() // Re-render on toggle
        );
    }
}
