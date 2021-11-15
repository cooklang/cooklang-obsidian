import './styles.scss'
import { Plugin, WorkspaceLeaf, addIcon } from 'obsidian';
import './lib/codemirror'
import './mode/cook/cook'
import { CookView } from './cookView'
import { CookLangSettings, CookSettingsTab } from './settings'

export default class CookPlugin extends Plugin {

  settings: CookLangSettings;

  async onload() {
    super.onload();
    this.settings = Object.assign(new CookLangSettings(), await this.loadData());

    // register a custom icon
    this.addDocumentIcon("cook");

    // register the view and extensions
    this.registerView("cook", this.cookViewCreator);
    this.registerExtensions(["cook"], "cook");

    this.addSettingTab(new CookSettingsTab(this.app, this));

    // commands:
    // - Create new recipe
    // - Create recipe in new pane
    // - Convert markdown file to `.cook`

    this.addCommand({
      id: "create-cook",
      name: "Create new recipe",
      callback: async () => {
        const newFile = await this.cookFileCreator();
        this.app.workspace.getLeaf().openFile(newFile);
      }
    })

    this.addCommand({
      id: "create-cook-new-pane",
      name: "Create recipe in new pane",
      callback: async () => {
        const newFile = await this.cookFileCreator();
        const leaf = await this.app.workspace.getLeaf(true).openFile(newFile);
      }
    })

    // register the convert to cook command
    this.addCommand({
      id: "convert-to-cook",
      name: "Convert markdown file to `.cook`",
      checkCallback: (checking:boolean) => {
        const file = this.app.workspace.getActiveFile();
        const isMd = file.extension === "md";
        if(checking) {
          return isMd;
        }
        else if(isMd) {
          // replace last instance of .md with .cook
          this.app.vault.rename(file,file.path.replace(/\.md$/, ".cook")).then(() => {
            this.app.workspace.activeLeaf.openFile(file);
          });
        }
      }
    })
  }

  cookFileCreator = async () => {
    let newFileFolderPath = null;
    const newFileLocation = (this.app.vault as any).getConfig('newFileLocation');
    if(!newFileLocation || newFileLocation === "root") {
      newFileFolderPath = '/';
    }
    else if(newFileLocation === "current") {
      newFileFolderPath = this.app.workspace.getActiveFile()?.parent?.path;
    }
    else{
      newFileFolderPath = (this.app.vault as any).getConfig('newFileFolderPath');
    }

    if(!newFileFolderPath) newFileFolderPath = '/';
    else if(!newFileFolderPath.endsWith('/')) newFileFolderPath += '/';

    const originalPath = newFileFolderPath;
    newFileFolderPath = newFileFolderPath + 'Untitled.cook';
    let i = 0;
    while(this.app.vault.getAbstractFileByPath(newFileFolderPath)) {
      newFileFolderPath = `${originalPath}Untitled ${++i}.cook`;
    }
    const newFile = await this.app.vault.create(newFileFolderPath, '');
    return newFile;
  }

  // function to create the view
  cookViewCreator = (leaf: WorkspaceLeaf) => {
    return new CookView(leaf, this.settings);
  }

  reloadCookViews() {
    this.app.workspace.getLeavesOfType('cook').forEach(leaf => {
      if(leaf.view instanceof CookView) {
        leaf.view.settings = this.settings;
        if(leaf.view.recipe) leaf.view.renderPreview(leaf.view.recipe);
      }
    });
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
