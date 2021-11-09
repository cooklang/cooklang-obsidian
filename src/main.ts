import './styles.scss'
import { Plugin, WorkspaceLeaf, addIcon } from 'obsidian';
import './lib/codemirror'
import './mode/cook/cook'
import { CookView } from './cookView'

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

    // register the convert to cook command
    this.addCommand({
      id: "convert-to-cook",
      name: "Convert markdown file to `.cook`",
      checkCallback: (checking:boolean) => {
        const file = this.app.workspace.getActiveFile();
        if(checking) {
          return file.extension === "md";
        }
        else {
          // replace last instance of .md with .cook
          this.app.vault.rename(file,file.path.replace(/\.md$/, ".cook")).then(() => {
            this.app.workspace.activeLeaf.openFile(file);
          });
        }
      }
    })
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
