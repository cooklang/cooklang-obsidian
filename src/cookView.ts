import { Cookware, Ingredient, Recipe, Timer } from 'cooklang'
import { TextFileView, setIcon, TFile, Keymap, WorkspaceLeaf, ViewStateResult, Notice } from 'obsidian'
import { CooklangSettings } from './settings';
import { Howl } from 'howler';
import alarmMp3 from './alarm.mp3'
import timerMp3 from './timer.mp3'

// CodeMirror is loaded globally
declare const CodeMirror: any;

// This is the custom view
export class CookView extends TextFileView {
  settings: CooklangSettings;
  previewEl: HTMLElement;
  sourceEl: HTMLElement;
  editor: any; // Using any for CodeMirror.Editor since it's loaded globally
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
    this.previewEl = this.contentEl.createDiv({ cls: 'cook-preview-view' });

    // Add Source Mode Container
    this.sourceEl = this.contentEl.createDiv({ cls: 'cook-source-view-full', attr: { 'style': 'display: block' } });

    // Create CodeMirror Editor with specific config
    this.editor = CodeMirror.fromTextArea(this.sourceEl.createEl('textarea', { cls: 'cook-cm-editor' }), {
      lineNumbers: (this.app.vault as any).getConfig('showLineNumber'),
      lineWrapping: this.settings.lineWrap,
      scrollbarStyle: 'native',
      keyMap: "default",
      theme: "obsidian"
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
    // console.log(state);
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
          const viewState = this.app.workspace.activeLeaf?.getViewState();
          if (viewState) {
            viewState.state = { ...viewState.state, mode: mode };
            this.app.workspace.activeLeaf?.setViewState(viewState);
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
    this.recipe = new Recipe(this.data);
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
    this.recipe = new Recipe(data);
    // if we're in preview view, also render that
    if (this.currentView === 'preview') this.renderPreview(this.recipe);
  }

  // clear the editor, etc
  clear() {
    this.previewEl.empty();
    this.editor.setValue('');
    this.editor.clearHistory();
    this.recipe = new Recipe();
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
      // https://org/docs/spec/#adding-pictures
      const otherFiles: TFile[] = this.file.parent.children.filter(f => (f instanceof TFile) && (f.basename == this.file.basename || f.basename.startsWith(this.file.basename + '.')) && f.name != this.file.name) as TFile[];
      otherFiles.forEach(f => {
        // convention specifies JPEGs and PNGs. Added GIFs as well. Why not?
        if (f.extension == "jpg" || f.extension == "jpeg" || f.extension == "png" || f.extension == "gif") {
          // main recipe image
          if (f.basename == this.file.basename) recipe.image = f;
          else {
            const split = f.basename.split('.');
            // individual step images
            let s:number;
            if (split.length == 2 && (s = parseInt(split[1])) >= 0 && s < recipe.steps.length) {
              recipe.steps[s].image = f;
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
        if (ingredient.amount !== undefined && ingredient.amount !== null) {
          li.createEl('span', { cls: 'amount', text: String(ingredient.amount) });
          li.appendText(' ');
        }
        if (ingredient.units !== undefined && ingredient.units !== null) {
          li.createEl('span', { cls: 'unit', text: String(ingredient.units) });
          li.appendText(' ');
        }

        li.appendText(ingredient.name ?? '');
      });
    }

    if(this.settings.showCookwareList) {
      // Add the Cookware header
      this.previewEl.createEl('h2', { cls: 'cookware-header', text: 'Cookware' });

      // Add the Cookware list
      const ul = this.previewEl.createEl('ul', { cls: 'cookware' });
      recipe.cookware.forEach(item => {
        const li = ul.createEl('li');
        const amount = (item as any).amount;
        if (amount !== undefined && amount !== null) {
          li.createEl('span', { cls: 'amount', text: String(amount) });
          li.appendText(' ');
        }

        li.appendText(item.name ?? '');
      });
    }

    if (this.settings.showTimersList) {
      // Add the Timer header
      this.previewEl.createEl('h2', { cls: 'timer-header', text: 'Timers' });

      // Add the Timer list
      const timerUl = this.previewEl.createEl('ul', { cls: 'timers' });
      recipe.timers.forEach(timer => {
        const li = timerUl.createEl('li');
        if (timer.amount !== undefined && timer.amount !== null) {
          li.createEl('span', { cls: 'amount', text: String(timer.amount) });
          li.appendText(' ');
        }
        if (timer.units !== undefined && timer.units !== null) {
          li.createEl('span', { cls: 'unit', text: String(timer.units) });
          li.appendText(' ');
        }

        li.appendText(timer.name ?? '');
      });
    }

    if(this.settings.showTotalTime) {
      let time = recipe.calculateTotalTime();
      if(time > 0) {
        // Add the Timers header
        this.previewEl.createEl('h2', { cls: 'time-header', text: 'Total Time' });
        this.previewEl.createEl('p', { cls: 'time', text: this.formatTime(time) });
      }
    }

    // Add the Method header
    this.previewEl.createEl('h2', { cls: 'method-header', text: 'Method' });

    // Add the Method list
    const methodOl = this.previewEl.createEl('ol', { cls: 'method' });
    recipe.steps.forEach((step, i) => {
      const li = methodOl.createEl('li');

      // Add step image if it exists
      if (this.settings.showImages && step.image) {
        const img = li.createEl('img', { cls: 'step-image' });
        img.src = this.app.vault.getResourcePath(step.image);
      }

      // Add step text
      const text = li.createEl('div', { cls: 'step-text' });
      const stepText = (step as any).text || step.line || [];
      stepText.forEach((part: any) => {
        if (typeof part === 'string') {
          text.appendText(part);
        } else {
          const span = text.createEl('span');
          if (part.type === 'ingredient') {
            span.addClass('ingredient');
            span.appendText(part.name ?? '');
            if (part.amount !== undefined && part.amount !== null) {
              span.appendText(' (');
              span.createEl('span', { cls: 'amount', text: String(part.amount) });
              if (part.units !== undefined && part.units !== null) {
                span.appendText(' ');
                span.createEl('span', { cls: 'unit', text: String(part.units) });
              }
              span.appendText(')');
            }
          } else if (part.type === 'cookware') {
            span.addClass('cookware');
            span.appendText(part.name ?? '');
            if (part.amount !== undefined && part.amount !== null) {
              span.appendText(' (');
              span.createEl('span', { cls: 'amount', text: String(part.amount) });
              span.appendText(')');
            }
          } else if (part.type === 'timer') {
            span.addClass('timer');
            const button = span.createEl('button', { cls: 'timer-button' });
            button.appendText('⏲');
            if (part.amount !== undefined && part.amount !== null) {
              button.appendText(' ');
              button.createEl('span', { cls: 'amount', text: this.formatTime(part.amount) });
            }
            if (part.name) {
              button.appendText(' ');
              button.createEl('span', { cls: 'name', text: String(part.name) });
            }
            this.makeTimer(button, part.amount ?? 0, part.name ?? '');
          }
        }
      });
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
