import {Cookware, Ingredient, Timer, Text, Recipe} from '@cooklang/cooklang-ts';
import {TextFileView, setIcon, TFile, Keymap, WorkspaceLeaf, ViewStateResult, Notice} from 'obsidian'
import {CooklangSettings} from './settings';
import {Howl} from 'howler';
import alarmMp3 from './alarm.mp3'
import timerMp3 from './timer.mp3'
import {EditorView, keymap, highlightActiveLine, lineNumbers, ViewPlugin} from "@codemirror/view"
import {EditorState, Extension} from "@codemirror/state"
import {syntaxHighlighting, defaultHighlightStyle, HighlightStyle} from "@codemirror/language"
import {oneDark} from "@codemirror/theme-one-dark"
import {cooklang} from './mode/cook/cook'
import {tags as t} from "@lezer/highlight"
import {string} from "postcss-selector-parser";

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
    recipe: Recipe;
    changeModeButton: HTMLElement;
    currentView: 'source' | 'preview';
    alarmAudio: Howl;
    timerAudio: Howl;
    data: string = '';

    constructor(leaf: WorkspaceLeaf, settings: CooklangSettings) {
        super(leaf);
        this.settings = settings;

        // Add Preview Container
        this.previewEl = this.contentEl.createDiv({cls: 'cook-preview-view'});

        // Add Source Mode Container with padding
        this.sourceEl = this.contentEl.createDiv({
            cls: 'cook-source-view-full',
            attr: {
                'style': 'display: block; padding: 0 20px;'
            }
        });

        // Check if Obsidian is in dark mode
        const isDarkMode = document.body.classList.contains('theme-dark');

        // Create CodeMirror 6 Editor
        const state = EditorState.create({
            doc: '',
            extensions: [
                // Line numbers are disabled by default
                // lineNumbers(),
                highlightActiveLine(),
                // Apply appropriate syntax highlighting based on theme
                syntaxHighlighting(isDarkMode ? defaultHighlightStyle : cooklangLightTheme, {fallback: true}),
                EditorView.contentAttributes.of({contenteditable: "true"}),
                EditorView.lineWrapping,
                keymap.of([
                    // Add Enter key handling
                    {
                        key: "Enter", run: (view) => {
                            const from = view.state.selection.main.from;
                            const to = view.state.selection.main.to;
                            const insert = "\n";

                            // Insert the newline
                            view.dispatch(view.state.update({
                                changes: {from, to, insert},
                                // Move cursor to the position after the newline
                                selection: {anchor: from + insert.length}
                            }));

                            return true;
                        }
                    }
                ]),
                // Only apply oneDark theme if Obsidian is in dark mode
                ...(isDarkMode ? [oneDark] : []),
                cooklang,
                ViewPlugin.define(() => ({
                    update: () => {
                        this.requestSave();
                        return null;
                    }
                })),
                // Add padding and max-width to the editor
                EditorView.theme({
                    "&": {
                        padding: "0 20px",
                        maxWidth: "800px",
                        margin: "0 auto"
                    },
                    "&.cm-focused": {
                        outline: "none"
                    }
                })
            ],
        });

        this.editorView = new EditorView({
            state,
            parent: this.sourceEl
        });

        // Initialize audio
        this.alarmAudio = new Howl({
            src: [alarmMp3],
            volume: 0.5
        });
        this.timerAudio = new Howl({
            src: [timerMp3],
            volume: 0.5
        });
    }

    onload() {
        // add the action to switch between source and preview mode
        this.changeModeButton = this.addAction('lines-of-text', 'Preview (Ctrl+Click to open in new pane)', (evt) => this.switchMode(evt));

        // Default to source mode
        this.currentView = 'source';

        // Listen for theme changes
        this.registerEvent(
            this.app.workspace.on('css-change', () => {
                this.updateEditorTheme();
            })
        );
    }

    // Update editor theme based on Obsidian's current theme
    updateEditorTheme() {
        const isDarkMode = document.body.classList.contains('theme-dark');

        // Get current state
        const currentState = this.editorView.state;

        // Create new state with or without oneDark theme
        const newState = EditorState.create({
            doc: currentState.doc,
            extensions: [
                // Line numbers are disabled by default
                // lineNumbers(),
                highlightActiveLine(),
                // Apply appropriate syntax highlighting based on theme
                syntaxHighlighting(isDarkMode ? defaultHighlightStyle : cooklangLightTheme, {fallback: true}),
                EditorView.contentAttributes.of({contenteditable: "true"}),
                EditorView.lineWrapping,
                keymap.of([
                    // Add Enter key handling
                    {
                        key: "Enter", run: (view) => {
                            const from = view.state.selection.main.from;
                            const to = view.state.selection.main.to;
                            const insert = "\n";

                            // Insert the newline
                            view.dispatch(view.state.update({
                                changes: {from, to, insert},
                                // Move cursor to the position after the newline
                                selection: {anchor: from + insert.length}
                            }));

                            return true;
                        }
                    }
                ]),
                // Only apply oneDark theme if Obsidian is in dark mode
                ...(isDarkMode ? [oneDark] : []),
                cooklang,
                ViewPlugin.define(() => ({
                    update: () => {
                        this.requestSave();
                        return null;
                    }
                })),
                // Add padding and max-width to the editor
                EditorView.theme({
                    "&": {
                        padding: "0 20px",
                        maxWidth: "800px",
                        margin: "0 auto"
                    },
                    "&.cm-focused": {
                        outline: "none"
                    }
                })
            ],
        });

        // Update the editor view with the new state
        this.editorView.setState(newState);
    }

    getState(): any {
        return super.getState();
    }

    setState(state: any, result: ViewStateResult): Promise<void> {
        return super.setState(state, result).then(() => {
            if (state.mode) this.switchMode(state.mode);
        });
    }

    switchMode(arg: 'source' | 'preview' | MouseEvent) {
        let mode = arg;
        // if force mode not provided, switch to opposite of current mode
        if (!mode || mode instanceof MouseEvent) mode = this.currentView === 'source' ? 'preview' : 'source';

        if (arg instanceof MouseEvent) {
            if (Keymap.isModEvent(arg)) {
                this.app.workspace.duplicateLeaf(this.leaf).then(() => {
                    const viewState = this.app.workspace.activeLeaf?.getViewState();
                    if (viewState) {
                        viewState.state = {...viewState.state, mode: mode};
                        this.app.workspace.activeLeaf?.setViewState(viewState);
                    }
                });
            } else {
                this.setState({...this.getState(), mode: mode}, {history: true});
            }
        } else {
            // switch to preview mode
            if (mode === 'preview') {
                this.currentView = 'preview';
                setIcon(this.changeModeButton, 'pencil');
                this.changeModeButton.setAttribute('aria-label', 'Edit (Ctrl+Click to edit in new pane)');

                this.renderPreview(this.recipe);
                this.previewEl.style.setProperty('display', 'block');
                this.sourceEl.style.setProperty('display', 'none');
            }
            // switch to source mode
            else {
                this.currentView = 'source';
                setIcon(this.changeModeButton, 'lines-of-text');
                this.changeModeButton.setAttribute('aria-label', 'Preview (Ctrl+Click to open in new pane)');

                this.previewEl.style.setProperty('display', 'none');
                this.sourceEl.style.setProperty('display', 'block');
                this.editorView.requestMeasure();
            }
        }
    }

    // get the data for save
    getViewData() {
        this.data = this.editorView.state.doc.toString();
        // may as well parse the recipe while we're here.
        this.recipe = new Recipe(this.data);
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

        this.recipe = new Recipe(this.data);
        // if we're in preview view, also render that
        if (this.currentView === 'preview') this.renderPreview(this.recipe);
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
    renderPreview(recipe: Recipe) {

        // clear the preview before adding the rest
        this.previewEl.empty();

        // we can't render what we don't have...
        if (!recipe) return;

        let recipeImage
        if (this.settings.showImages) {
            // add any files following the cooklang conventions to the recipe object
            // https://org/docs/spec/#adding-pictures
            const otherFiles: TFile[] = this.file?.parent?.children.filter(f => (f instanceof TFile) && (f.basename == this.file?.basename || f.basename.startsWith(this.file?.basename + '.')) && f.name != this.file?.name) as TFile[] || [];
            otherFiles.forEach(f => {
                // convention specifies JPEGs and PNGs. Added GIFs as well. Why not?
                if (f.extension == "jpg" || f.extension == "jpeg" || f.extension == "png" || f.extension == "gif" || f.extension == "webp") {
                    // main recipe image
                    if (f.basename == this.file?.basename) recipeImage = f;
                }
            })

            // if there is a main image, put it as a banner image at the top
            if (recipeImage) {
                const img = this.previewEl.createEl('img', {cls: 'main-image'});
                img.src = this.app.vault.getResourcePath(recipeImage);
            }
        }

        function isValidUrl(str: string): boolean {
            try {
                new URL(str);
                return true;
            } catch {
                return false;
            }
        }
        
        if (recipe.metadata && Object.keys(recipe.metadata).length > 0) {
            // Add the metadata if exist
            this.previewEl.createEl('h2', { cls: 'metadata-header', text: this.settings.metadataLabel || 'Metadata' });
            const ul = this.previewEl.createEl('ul', { cls: 'metadata' });
            Object.entries(recipe.metadata).forEach(([key, value]) => {
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

        if (this.settings.showIngredientList && recipe.ingredients?.length) {
            // Add the Ingredients header
            this.previewEl.createEl('h2', {cls: 'ingredients-header', text: this.settings.ingredientLabel || 'Ingredients'});

            // Add the ingredients list
            const ul = this.previewEl.createEl('ul', {cls: 'ingredients'});
            recipe.ingredients.forEach(ingredient => {
                const li = ul.createEl('li');
                if (ingredient.quantity !== undefined && ingredient.quantity !== null) {
                    li.createEl('span', {cls: 'amount', text: String(ingredient.quantity)});
                    li.appendText(' ');
                }
                if (ingredient.units !== undefined && ingredient.units !== null) {
                    li.createEl('span', {cls: 'unit', text: String(ingredient.units)});
                    li.appendText(' ');
                }

                li.appendText(ingredient.name ?? '');
            });
        }

        if (this.settings.showCookwareList && recipe.cookwares?.length) {
            // Add the Cookware header
            this.previewEl.createEl('h2', {cls: 'cookware-header', text: this.settings.cookwareLabel || 'Cookware'});

            // Add the Cookware list
            const ul = this.previewEl.createEl('ul', {cls: 'cookware'});
            recipe.cookwares.forEach(item => {
                const li = ul.createEl('li');
                const amount = (item as any).quantity;
                if (amount !== undefined && amount !== null) {
                    li.createEl('span', {cls: 'amount', text: String(amount)});
                    li.appendText(' ');
                }

                li.appendText(item.name ?? '');
            });
        }

        let timers = recipe.steps
            .reduce((acc, step) => [...acc, ...step], [])
            .filter(step => step.type === 'timer')
        if (this.settings.showTimersList && timers?.length) {
            // Add the Timer header
            this.previewEl.createEl('h2', {cls: 'timer-header', text: this.settings.timersLabel ||'Timers'});

            // Add the Timer list
            const timerUl = this.previewEl.createEl('ul', {cls: 'timers'});
            timers
                .forEach(timer => {
                    const li = timerUl.createEl('li');
                    if (timer.quantity !== undefined && timer.quantity !== null) {
                        li.createEl('span', {cls: 'amount', text: String(timer.quantity)});
                        li.appendText(' ');
                    }
                    if (timer.units !== undefined && timer.units !== null) {
                        li.createEl('span', {cls: 'unit', text: String(timer.units)});
                        li.appendText(' ');
                    }

                    li.appendText(timer.name ?? '');
                });
        }

        function _timerToSecond(timer: Timer) {
            let amount = Number(timer.quantity || 0)
            let unit = timer.units || 'm'
            let time = 0

            if (amount > 0) {
                if (unit.toLowerCase().startsWith('s')) {
                    time = amount
                } else if (unit.toLowerCase().startsWith('m')) {
                    time = amount * 60
                } else if (unit.toLowerCase().startsWith('h')) {
                    time = amount * 60 * 60
                }
            }
            return time

        }

        function _getTotalTime(timers: Timer[]): number {
            return this.timers.reduce((total: number, timer: Timer) => {
                return total + _timerToSecond(timer)
            }, 0)
        }

        if (this.settings.showTotalTime && false) {
            let time = _getTotalTime(timers);
            if (time > 0) {
                // Add the Timers header
                this.previewEl.createEl('h2', {cls: 'time-header', text: 'Total Time'});
                this.previewEl.createEl('p', {cls: 'time', text: this.formatTime(time)});
            }
        }

        // Add the Method header
        this.previewEl.createEl('h2', {cls: 'method-header', text: this.settings.methodLabel || 'Method'});

        // Add the Method list
        const methodOl = this.previewEl.createEl('ol', {cls: 'method'});

        // unitMap to normalize different time units (min, hrs) into seconds
        const unitMap: Record<string, number> = {};
		(this.settings.minutesLabel || "m,min,minute,minutes")
			.split(",")
			.map(s => s.trim())
			.filter(Boolean)
			.forEach(label => {
				unitMap[label] = 60;
			});

		(this.settings.hoursLabel || "h,hr,hrs,hour,hours")
			.split(",")
			.map(s => s.trim())
			.filter(Boolean)
			.forEach(label => {
				unitMap[label] = 3600;
			});
        
        recipe.steps.forEach((step, i) => {
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
                        span.appendText(part.name ?? '');
                        if (part.quantity !== undefined && part.quantity !== null) {
                            span.appendText(' (');
                            span.createEl('span', {cls: 'amount', text: String(part.quantity)});
                            if (part.units !== undefined && part.units !== null) {
                                span.appendText(' ');
                                span.createEl('span', {cls: 'unit', text: String(part.units)});
                            }
                            span.appendText(')');
                        }
                    } else if (part.type === "cookware") {
                        span.addClass('cookware');
                        span.appendText(part.name ?? '');
                        if (part.quantity !== undefined && part.quantity !== null) {
                            span.appendText(' (');
                            span.createEl('span', {cls: 'amount', text: String(part.quantity)});
                            span.appendText(')');
                        }
                    } else if (part.type === "timer") {
                        span.addClass('timer');
                        const button = span.createEl('button', {cls: 'timer-button'});
                        button.appendText('⏲');
                        if (part.quantity !== undefined && part.quantity !== null && typeof part.quantity === "number") {
                            button.appendText(' ');
                            const multiplier = (unitMap as Record<string, number>)[part.units.toLowerCase()] ?? 1;
                            part.quantity = part.quantity * multiplier;
                            // TODO: part.quantity may be string with time description
                            button.createEl('span', {cls: 'amount', text: this.formatTime(part.quantity)});
                        }
                        if (part.name) {
                            button.appendText(' ');
                            button.createEl('span', {cls: 'name', text: String(part.name)});
                        }
                        // TODO: part.quantity may be string with time description
                        if (typeof part.quantity === "number")
                            this.makeTimer(button, part.quantity ?? 0, part.name ?? '');
                    }
                }
            })
        });
    }

    makeTimer(el: Element, seconds: number, name: string) {
        let end: Date | null = null;
        let interval: number | null = null;

        const stop = () => {
            if (interval !== null) {
                window.clearInterval(interval);
                interval = null;
            }
            if (el.parentElement) {
                el.parentElement.removeClass('running');
            }
            this.timerAudio.stop();
            end = null;
        };

        el.addEventListener('click', () => {
            if (end === null) {
                end = new Date(Date.now() + seconds * 1000);
                if (el.parentElement) {
                    el.parentElement.addClass('running');
                }
                interval = window.setInterval(() => {
                    this.updateTimer(el, seconds, end!, stop, name);
                }, 100);
            } else {
                stop();
            }
        });
    }

    updateTimer(el: Element, totalSeconds: number, end: Date, stop: Function, name: string) {
        const now = new Date();
        const remaining = Math.round((end.getTime() - now.getTime()) / 1000);

        if (remaining <= 0) {
            stop();
            this.alarmAudio.play();
            new Notification('Timer Complete', {
                body: `${name || 'Timer'} for ${this.formatTimeForTimer(totalSeconds)} is done!`
            });
        } else {
            const text = this.formatTimeForTimer(remaining);
            const amountEl = el.querySelector('.amount');
            if (amountEl) {
                amountEl.textContent = text;
            }
        }
    }

    formatTime(time: number, showSeconds: boolean = false): string {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m${showSeconds ? ` ${seconds}s` : ''}`;
        } else if (minutes > 0) {
            return `${minutes}m${showSeconds ? ` ${seconds}s` : ''}`;
        } else {
            return `${seconds}s`;
        }
    }

    formatTimeForTimer(time: number): string {
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = time % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}
