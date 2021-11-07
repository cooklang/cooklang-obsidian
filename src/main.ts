import './styles.scss'
import { Plugin, WorkspaceLeaf, addIcon, TextFileView, setIcon, TFile } from 'obsidian';
import './lib/codemirror'
import './mode/cook/cook'

export default class CookPlugin extends Plugin {

  settings: any;

  async onload() {
    super.onload();
    this.settings = await this.loadData() || {} as any;

    // register a custom icon
    this.addDocumentIcon("cook");

    // register the view and extensions
    this.registerView("cook", this.cookViewCreator);
    this.registerExtensions(["cook"], "cook");
  }

  // function to create the view
  cookViewCreator = (leaf: WorkspaceLeaf) => {
    return new CookView(leaf);
  }

  // this function provides the icon for the document
  // I added a modification of the CookLang icon with no colours or shadows
  addDocumentIcon = (extension: string) => {
    addIcon(`document-${extension}`, `
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 48C39.9411 48 48 39.9411 48 30H12C12 39.9411 20.0589 48 30 48Z" fill="currentColor"/>
    <circle cx="18" cy="18" r="4" fill="currentColor"/>
    <circle cx="42" cy="18" r="4" fill="currentColor"/>
    <circle cx="30" cy="16" r="4" fill="currentColor"/>
    </svg>
    `);
  }
}

// This is the custom view
class CookView extends TextFileView {
  viewEl: HTMLElement;
	previewEl: HTMLElement;
	sourceEl: HTMLElement;
	editorEl: HTMLTextAreaElement;
	editor: CodeMirror.Editor;

  constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		// Get View Container Element
		this.viewEl = this.containerEl.getElementsByClassName('view-content')[0] as HTMLElement;
		// Add Preview Mode Container
		this.previewEl = this.viewEl.createDiv({ cls: 'cook-preview-view', attr: { 'style': 'display: block' } });
		// Add Source Mode Container
		this.sourceEl = this.viewEl.createDiv({ cls: 'cook-source-view', attr: { 'style': 'display: none' } });
		// Add code mirro editor
		this.editorEl = this.sourceEl.createEl('textarea', { cls: 'cook-cm-editor' });
		// Create Code Mirror Editor with specific config
		this.editor = CodeMirror.fromTextArea(this.editorEl, {
			lineNumbers: false,
			lineWrapping: true,
			scrollbarStyle: null,
			keyMap: "default",
      theme: "obsidian"
		});
		this.render = this.render.bind(this);
	}

  onload() {
		let changeMode = this.containerEl.getElementsByClassName('view-actions')[0].createEl('a', { cls: 'view-action', attr: { 'aria-label': 'Edit' } });
		setIcon(changeMode, 'pencil', 17);

		changeMode.onClickEvent(() => {

			let currentMode = this.previewEl.style.getPropertyValue('display');
			if (currentMode == "block") {
				this.previewEl.style.setProperty('display', 'none');
				this.sourceEl.style.setProperty('display', 'block');
				this.editor.refresh();
				return;
			}

			this.render();
			this.previewEl.style.setProperty('display', 'block');
			this.sourceEl.style.setProperty('display', 'none');
		});

		// Save file on change
		this.editor.on('change', () => {
			this.requestSave();
		});
	}

  getViewData() {
		return this.editor.getValue();
	}
  
  async setViewData(data: string, clear: boolean) {
    if (clear) {
      this.editor.swapDoc(CodeMirror.Doc(data, "text/x-cook"))
      this.editor.clearHistory();
    }

    this.editor.setValue(data);
    this.parseCooklang(data, this.previewEl);
	}

  clear() {
		this.previewEl.empty();
		this.editor.setValue('');
		this.editor.clearHistory();
	}

  async render() {
		let editorValue = this.editor.getValue();
		this.data = editorValue;
		this.parseCooklang(editorValue, this.previewEl);
		return editorValue;
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

  // parse the cooklang code and display it in the preview
  parseCooklang(source:string, destEl:HTMLElement) {

    const recipe = new Recipe();

    const otherFiles:TFile[] = this.file.parent.children.filter(f => (f instanceof TFile) && (f.basename == this.file.basename || f.basename.startsWith(this.file.basename + '.')) && f.name != this.file.name ) as TFile[];
    otherFiles.forEach( f => {
      if(f.extension == "jpg" || f.extension == "jpeg" || f.extension == "png"){
        if(f.basename == this.file.basename) recipe.image = f;
        else {
          const split = f.basename.split('.');
          if(split.length == 2 && parseInt(split[1])){
            recipe.methodImages.set(parseInt(split[1]), f);
          }
        }
      }
    })

    source.split('\n').forEach(line => {

      let match:RegExpExecArray;
      // skip blank lines
      if(line.trim().length === 0) return;
      // metadata lines
      else if(match = Metadata.regex.exec(line)){
        recipe.metadata.push(new Metadata(match[0]));
      }
      else {
        // clear comments
        line = line.replace(/\/\/.*/, '');
        if(line.trim().length === 0) return;

        while(match = Ingredient.regex.exec(line)){
          const ingredient = new Ingredient(match[0]);
          recipe.ingredients.push(ingredient);
          line = line.replace(match[0], ingredient.methodOutput());
        }

        while(match = Cookware.regex.exec(line)){
          const c = new Cookware(match[0]);
          recipe.cookware.push(c);
          line = line.replace(match[0], c.methodOutput());
        }

        while(match = Timer.regex.exec(line)){
          const t = new Timer(match[0]);
          recipe.timers.push(t);
          line = line.replace(match[0], t.methodOutput());
        }

        // add in the method line
        recipe.method.push(line.trim());
      }
    });

    console.log(recipe);

    destEl.innerHTML = '';

    if(recipe.image){
      const img = createEl('img');
      img.addClass('main-image');
      img.src = this.app.vault.getResourcePath(recipe.image);
      destEl.appendChild(img);
    }
    
    const hi = createEl('h2');
    hi.innerText = "Ingredients";
    hi.addClass('ingredients-header')
    destEl.appendChild(hi);

    const iul = createEl('ul');
    iul.addClass('ingredients');
    recipe.ingredients.forEach(ingredient => {
      const ili = createEl('li');
      if(ingredient.amount !== null){
        const span = createEl('span');
        span.addClass('amount');
        span.innerText = ingredient.amount;
        ili.appendChild(span);
        ili.appendText(' ');
      }
      if(ingredient.unit !== null){
        const span = createEl('span');
        span.addClass('unit');
        span.innerText = ingredient.unit;
        ili.appendChild(span);
        ili.appendText(' ');
      }

      ili.appendText(ingredient.name);
      iul.appendChild(ili);
    })
    destEl.appendChild(iul);

    const hm = createEl('h2');
    hm.innerText = "Method";
    hm.addClass('method-header');
    destEl.appendChild(hm);

    const mol = createEl('ol');
    mol.addClass('method');
    let i = 1;
    recipe.method.forEach(line => {
      const mli = createEl('li');
      mli.innerHTML = line;
      if(recipe.methodImages.has(i)){
        const img = createEl('img');
        img.addClass('method-image');
        img.src = this.app.vault.getResourcePath(recipe.methodImages.get(i));
        mli.append(img);
      }
      i++;
      mol.appendChild(mli);
    });
    destEl.appendChild(mol);
  }
}

class Recipe {
  metadata:Metadata[] = [];
  ingredients:Ingredient[] = [];
  cookware:Cookware[] = [];
  timers:Timer[] = [];
  method:string[] = [];
  image:TFile;
  methodImages:Map<Number,TFile> = new Map<Number,TFile>();
}

class Ingredient {
  static regex = /@(?:([^@#~]+?)(?:{(.*?)}|{}))|@(.+?\b)/;
  constructor(s:string){
    this.originalString = s;
    const match = Ingredient.regex.exec(s);
    this.name = match[1] || match[3];
    const attrs = match[2]?.split('%');
    this.amount = attrs && attrs.length > 0 ? attrs[0] : null;
    this.unit = attrs && attrs.length > 1 ? attrs[1] : null;
  }
  originalString: string = null;
  name: string = null;
  amount: string = null;
  unit: string = null;

  methodOutput = () => {
    return `<span class='ingredient'>${this.name}</span>`;
  }
  listOutput = () => {
    let s = ``;
    if(this.amount !== null){
      s += `<span class='amount'>${this.amount}</span> `;
    }
    if(this.unit !== null){
      s += `<span class='unit'>${this.unit}</span> `;
    }

    s += this.name;
    return s;
  }
}

class Cookware {
  static regex = /#(?:([^@#~]+?)(?:{}))|#(.+?\b)/;
  originalString: string = null;
  name: string = null;

  constructor(s:string){
    this.originalString = s;
    const match = Cookware.regex.exec(s);
    this.name = match[1] || match[2];
  }

  methodOutput = () => {
    return `<span class='cookware'>${this.name}</span>`;
  }
  listOutput = () => {
    return this.name;
  }
}

class Timer {
  static regex = /~{([0-9]+)%(.+?)}/;
  originalString: string = null;
  amount: string = null;
  unit: string = null;

  constructor(s:string){
    const match = Timer.regex.exec(s);
    this.amount = match[1];
    this.unit = match[2];
  }

  methodOutput = () => {
    return `<span class='time time-amount'>${this.amount}</span> <span class='time-unit'>${this.unit}</span>`;
  }
  listOutput = () => {
    return `<span class='time-amount'>${this.amount}</span> <span class='time-unit'>${this.unit}</span>`;
  }
}

class Metadata {
  static regex = />>\s*(.*?):\s*(.*)/;
  originalString: string = null;
  key: string = null;
  value: string = null;

  constructor(s:string){
    const match = Metadata.regex.exec(s);
    this.key = match[1].trim();
    this.value = match[2].trim();
  }

  methodOutput = () => {
    return `<span class='metadata metadata-key'>${this.key}</span> <span class='metadata metadata-value'>${this.value}</span>`;
  }
  listOutput = () => {
    return `<span class='metadata-key'>${this.key}</span> <span class='metadata-value'>${this.value}</span>`;
  }
}
