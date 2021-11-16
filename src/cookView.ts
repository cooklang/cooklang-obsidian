import { CookLang, Recipe } from './cooklang'
import { TextFileView, setIcon, TFile, Keymap, WorkspaceLeaf, ViewStateResult } from 'obsidian'
import { CookLangSettings } from './settings';

// This is the custom view
export class CookView extends TextFileView {
  settings: CookLangSettings;
  viewEl: HTMLElement;
  previewEl: HTMLElement;
  sourceEl: HTMLElement;
  editorEl: HTMLTextAreaElement;
  editor: CodeMirror.Editor;
  recipe: Recipe;
  changeModeButton: HTMLElement;
  currentView: 'source' | 'preview';

  constructor(leaf: WorkspaceLeaf, settings: CookLangSettings) {
    super(leaf);
    this.settings = settings;
    // Add Preview Mode Container
    this.previewEl = this.contentEl.createDiv({ cls: 'cook-preview-view', attr: { 'style': 'display: none' } });
    // Add Source Mode Container
    this.sourceEl = this.contentEl.createDiv({ cls: 'cook-source-view', attr: { 'style': 'display: block' } });
    // Add container for CodeMirror editor
    this.editorEl = this.sourceEl.createEl('textarea', { cls: 'cook-cm-editor' });
    // Create CodeMirror Editor with specific config
    this.editor = CodeMirror.fromTextArea(this.editorEl, {
      lineNumbers: false,
      lineWrapping: true,
      scrollbarStyle: null,
      keyMap: "default",
      theme: "obsidian"
    });
  }

  onload() {
    // Save file on change
    this.editor.on('change', () => {
      this.requestSave();
    });

    // add the action to switch between source and preview mode
    this.changeModeButton = this.addAction('lines-of-text', 'Preview (Ctrl+Click to open in new pane)', (evt) => this.switchMode(evt), 17);

    // undocumented: Get the current default view mode to switch to
    let defaultViewMode = (this.app.vault as any).getConfig('defaultViewMode');
    this.setState({ ...this.getState(), mode: defaultViewMode }, {});
  }

  getState(): any {
    return super.getState();
  }

  setState(state: any, result: ViewStateResult): Promise<void>{
    return super.setState(state, result).then(() => {
      if (state.mode) this.switchMode(state.mode);
    });
  }

  // function to switch between source and preview mode
  switchMode(arg: 'source' | 'preview' | MouseEvent) {
    let mode = arg;
    // if force mode not provided, switch to opposite of current mode
    if (!mode || mode instanceof MouseEvent) mode = this.currentView === 'source' ? 'preview' : 'source';

    if (arg instanceof MouseEvent) {
      if (Keymap.isModEvent(arg)) {
        this.app.workspace.duplicateLeaf(this.leaf).then(() => {
          const cookLeaf = this.app.workspace.activeLeaf?.view;
          if (cookLeaf) {
            cookLeaf.setState({ ...cookLeaf.getState(), mode: mode }, {});
          }
        });
      }
      else {
        this.setState({ ...this.getState(), mode: mode }, {});
      }
    }
    else {
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
        this.editor.refresh();
      }
    }
  }

  // get the data for save
  getViewData() {
    this.data = this.editor.getValue();
    // may as well parse the recipe while we're here.
    this.recipe = CookLang.parse(this.data);
    return this.data;
  }

  // load the data into the view
  async setViewData(data: string, clear: boolean) {
    this.data = data;

    if (clear) {
      this.editor.swapDoc(CodeMirror.Doc(data, "text/x-cook"))
      this.editor.clearHistory();
    }

    this.editor.setValue(data);
    this.recipe = CookLang.parse(data);
    // if we're in preview view, also render that
    if (this.currentView === 'preview') this.renderPreview(this.recipe);
  }

  // clear the editor, etc
  clear() {
    this.previewEl.empty();
    this.editor.setValue('');
    this.editor.clearHistory();
    this.recipe = new Recipe();
    this.data = null;
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

  // when the view is resized, refresh CodeMirror (thanks Licat!)
  onResize() {
    this.editor.refresh();
  }

  // icon for the view
  getIcon() {
    return "document-cook";
  }

  // render the preview view
  renderPreview(recipe: Recipe) {

    // clear the preview before adding the rest
    this.previewEl.empty();

    // we can't render what we don't have...
    if (!recipe) return;

    if(this.settings.showImages) {
      // add any files following the cooklang conventions to the recipe object
      // https://cooklang.org/docs/spec/#adding-pictures
      const otherFiles: TFile[] = this.file.parent.children.filter(f => (f instanceof TFile) && (f.basename == this.file.basename || f.basename.startsWith(this.file.basename + '.')) && f.name != this.file.name) as TFile[];
      otherFiles.forEach(f => {
        // convention specifies JPEGs and PNGs. Added GIFs as well. Why not?
        if (f.extension == "jpg" || f.extension == "jpeg" || f.extension == "png" || f.extension == "gif") {
          // main recipe image
          if (f.basename == this.file.basename) recipe.image = f;
          else {
            const split = f.basename.split('.');
            // individual step images
            if (split.length == 2 && parseInt(split[1])) {
              recipe.methodImages.set(parseInt(split[1]), f);
            }
          }
        }
      })
      
      // if there is a main image, put it as a banner image at the top
      if (recipe.image) {
        const img = this.previewEl.createEl('img', { cls: 'main-image' });
        img.src = this.app.vault.getResourcePath(recipe.image);
      }
    }

    if(this.settings.showIngredientList) {
      // Add the Ingredients header
      this.previewEl.createEl('h2', { cls: 'ingredients-header', text: 'Ingredients' });

      // Add the ingredients list
      const ul = this.previewEl.createEl('ul', { cls: 'ingredients' });
      recipe.ingredients.forEach(ingredient => {
        const li = ul.createEl('li');
        if (ingredient.amount !== null) {
          li.createEl('span', { cls: 'amount', text: ingredient.amount});
          li.appendText(' ');
        }
        if (ingredient.unit !== null) {
          li.createEl('span', { cls: 'unit', text: ingredient.unit});
          li.appendText(' ');
        }
        
        li.appendText(ingredient.name);
      })
    }

    if(this.settings.showCookwareList) {
      // Add the Cookware header
      this.previewEl.createEl('h2', { cls: 'cookware-header', text: 'Cookware' });

      // Add the Cookware list
      const ul = this.previewEl.createEl('ul', { cls: 'cookware' });
      recipe.cookware.forEach(item => {
        ul.createEl('li', { text: item.name });
      })
    }

    if(this.settings.showTotalTime) {
      let time = recipe.calculateTotalTime();
      if(time > 0) {
        // Add the Timers header
        this.previewEl.createEl('h2', { cls: 'time-header', text: 'Total Time' });
        this.previewEl.createEl('p', { cls: 'time', text: this.formatTime(time) });
      }
    }

    // add the method header
    this.previewEl.createEl('h2', { cls: 'method-header', text: 'Method' });

    // add the method list
    const mol = this.previewEl.createEl('ol', { cls: 'method' });
    let i = 1;
    recipe.method.forEach(line => {
      const mli = mol.createEl('li');
      mli.innerHTML = line;
      if (!this.settings.showQuantitiesInline) {
        mli.querySelectorAll('.amount')?.forEach(el => el.remove());
        mli.querySelectorAll('.unit')?.forEach(el => el.remove());
      }

      if (this.settings.showImages && recipe.methodImages.has(i)) {
        const img = mli.createEl('img', { cls: 'method-image' });
        img.src = this.app.vault.getResourcePath(recipe.methodImages.get(i));
      }
      i++;
    });
  }

  formatTime(time: number) {
    let minutes = Math.floor(time / 60);
    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;

    let result = "";
    if (hours > 0) result += hours + " hours ";
    if (minutes > 0) result += minutes + " minutes ";
    return result;
  }
}