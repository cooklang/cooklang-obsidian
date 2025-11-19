import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import {
    getMetadata,
    getFlatIngredients,
    getFlatCookware,
    getFlatTimers,
    getSteps,
    quantity_display,
    ingredient_display_name,
    cookware_display_name,
    getQuantityValue
} from './recipeHelpers';
import {TextFileView, setIcon, TFile, Keymap, WorkspaceLeaf, ViewStateResult, Notice} from 'obsidian'
import {CooklangSettings} from './settings';
import {EditorView, keymap, highlightActiveLine, lineNumbers, ViewPlugin} from "@codemirror/view"
import {EditorState, Extension} from "@codemirror/state"
import {syntaxHighlighting, defaultHighlightStyle, HighlightStyle} from "@codemirror/language"
import {oneDark} from "@codemirror/theme-one-dark"
import {cooklang} from './mode/cook/cook'
import {tags as t} from "@lezer/highlight"
import {string} from "postcss-selector-parser";
import { formatTime, createUnitMap } from './utils/timeFormatters';
import { findRecipeImages } from './utils/imageHelpers';
import { isValidUrl } from './utils/urlValidators';
import { parserService } from './services/ParserService';
import { TimerService } from './services/TimerService';
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
    data: string = '';

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
        return extension == 'cook';
    }

    getViewType() {
        return "cook";
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

        // clear the preview before adding the rest
        this.previewEl.empty();

        // we can't render what we don't have...
        if (!this.rawRecipe) return;

        const metadata = getMetadata(this.rawRecipe);
        const ingredients = getFlatIngredients(this.rawRecipe);
        const cookwares = getFlatCookware(this.rawRecipe);
        const steps = getSteps(this.rawRecipe);
        const timers = getFlatTimers(this.rawRecipe);

        let recipeImage
        if (this.settings.showImages) {
            // add any files following the cooklang conventions to the recipe object
            // https://cooklang.org/docs/spec/#adding-pictures
            const { mainImage } = findRecipeImages(this.file);
            recipeImage = mainImage;

            // if there is a main image, put it as a banner image at the top
            if (recipeImage) {
                const img = this.previewEl.createEl('img', {cls: 'main-image'});
                img.src = this.app.vault.getResourcePath(recipeImage);
            }
        }

        if (metadata && Object.keys(metadata).length > 0) {
            // Add the metadata if exist
            this.previewEl.createEl('h2', { cls: 'metadata-header', text: this.settings.metadataLabel || 'Metadata' });
            const ul = this.previewEl.createEl('ul', { cls: 'metadata' });
            Object.entries(metadata).forEach(([key, value]) => {
                const li = ul.createEl('li');
                li.createEl('span', { cls: 'metadata-key', text: key });
                // Prefix tags with a hashtag
                if (key == 'tags') {
                    const tags = value
                        .split(",")
                        .map(s => `#${s.trim()}`)
                        .join(", ");
                    li.appendText(tags);
                }
                else if (isValidUrl(value)) {
                    li.createEl('a', {
                        text: value,
                        attr: { href: value, target: '_blank', rel: 'noopener' }
                    });
                }
                else {
                    li.appendText(`${value}`);
                }
            });
        }

        if (this.settings.showIngredientList && ingredients?.length) {
            // Add the Ingredients header
            this.previewEl.createEl('h2', {cls: 'ingredients-header', text: this.settings.ingredientLabel || 'Ingredients'});

            // Add the ingredients list
            const ul = this.previewEl.createEl('ul', {cls: 'ingredients'});
            ingredients.forEach(ingredient => {
                const li = ul.createEl('li');
                if (ingredient.displayText) {
                    li.createEl('span', {cls: 'amount', text: ingredient.displayText});
                    li.appendText(' ');
                }
                li.appendText(ingredient.name);
            });
        }

        if (this.settings.showCookwareList && cookwares?.length) {
            // Add the Cookware header
            this.previewEl.createEl('h2', {cls: 'cookware-header', text: this.settings.cookwareLabel || 'Cookware'});

            // Add the Cookware list
            const ul = this.previewEl.createEl('ul', {cls: 'cookware'});
            cookwares.forEach(item => {
                const li = ul.createEl('li');
                if (item.displayText) {
                    li.createEl('span', {cls: 'amount', text: item.displayText});
                    li.appendText(' ');
                }
                li.appendText(item.name);
            });
        }

        if (this.settings.showTimersList && timers?.length) {
            // Add the Timer header
            this.previewEl.createEl('h2', {cls: 'timer-header', text: this.settings.timersLabel ||'Timers'});

            // Add the Timer list
            const timerUl = this.previewEl.createEl('ul', {cls: 'timers'});
            timers.forEach(timer => {
                const li = timerUl.createEl('li');
                if (timer.displayText) {
                    li.createEl('span', {cls: 'amount', text: timer.displayText});
                    li.appendText(' ');
                }
                li.appendText(timer.name ?? '');
            });
        }

        // Add the Method header
        this.previewEl.createEl('h2', {cls: 'method-header', text: this.settings.methodLabel || 'Method'});

        // Add the Method list
        const methodOl = this.previewEl.createEl('ol', {cls: 'method'});

        // unitMap to normalize different time units (min, hrs) into seconds
        const unitMap = createUnitMap(
            this.settings.minutesLabel || "m,min,minute,minutes",
            this.settings.hoursLabel || "h,hr,hrs,hour,hours"
        );

        steps.forEach((step, i) => {
            const li = methodOl.createEl('li');
            /*
                  // Add step image if it exists
                  if (this.settings.showImages && step.image) {
                    const img = li.createEl('img', { cls: 'step-image' });
                    img.src = this.app.vault.getResourcePath(step.image);
                  }
            */
            // Add step text
            const text = li.createEl('div', {cls: 'step-text'});
            step.forEach((part) => {
                if (part.type === 'text') {
                    text.appendText(part.value);
                } else {
                    const span = text.createEl('span');
                    if (part.type === "ingredient") {
                        span.addClass('ingredient');
                        const ing = part.ingredient;
                        span.appendText(ingredient_display_name(ing));
                        if (ing.quantity) {
                            span.appendText(' (');
                            span.createEl('span', {cls: 'amount', text: quantity_display(ing.quantity)});
                            span.appendText(')');
                        }
                    } else if (part.type === "cookware") {
                        span.addClass('cookware');
                        const cw = part.cookware;
                        span.appendText(cookware_display_name(cw));
                        if (cw.quantity) {
                            span.appendText(' (');
                            span.createEl('span', {cls: 'amount', text: quantity_display(cw.quantity)});
                            span.appendText(')');
                        }
                    } else if (part.type === "timer") {
                        span.addClass('timer');
                        const tm = part.timer;
                        const button = span.createEl('button', {cls: 'timer-button'});
                        button.appendText('⏲');

                        const numericQty = getQuantityValue(tm.quantity);
                        if (numericQty !== null) {
                            button.appendText(' ');
                            const unit = tm.quantity?.unit;
                            const multiplier = unit ? (unitMap as Record<string, number>)[unit.toLowerCase()] ?? 1 : 1;
                            const seconds = numericQty * multiplier;
                            button.createEl('span', {cls: 'amount', text: formatTime(seconds)});
                            this.makeTimer(button, seconds, tm.name ?? '');
                        }
                        if (tm.name) {
                            button.appendText(' ');
                            button.createEl('span', {cls: 'name', text: tm.name});
                        }
                    }
                }
            })
        });
    }
}
