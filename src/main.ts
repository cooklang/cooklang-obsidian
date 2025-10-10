import './styles.scss'
import {Plugin, WorkspaceLeaf, addIcon, TFile} from 'obsidian';
import {CookView} from './cookView'
import {CooklangSettings, CookSettingsTab} from './settings'

// CodeMirror is loaded globally by Obsidian
declare const CodeMirror: any;

export default class CookPlugin extends Plugin {

	settings: CooklangSettings;

	async onload() {
		super.onload();
		this.settings = Object.assign(new CooklangSettings(), await this.loadData());

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
				await this.app.workspace.getLeaf(true).openFile(newFile);
			}
		})

		// register the convert to cook command
		this.addCommand({
			id: "convert-to-cook",
			name: "Convert markdown file to `.cook`",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return false;
				const isMd = file.extension === "md";
				if (checking) {
					return isMd;
				} else if (isMd) {
					// replace last instance of .md with .cook
					this.app.vault.rename(file, file.path.replace(/\.md$/, ".cook")).then(() => {
						// Get the renamed file
						const renamedFile = this.app.vault.getAbstractFileByPath(file.path.replace(/\.md$/, ".cook"));
						if (renamedFile && renamedFile instanceof TFile) {
							// Open the file in the current leaf
							this.app.workspace.getLeaf().openFile(renamedFile);
						}
					});
				}
			}
		})
	}

	cookFileCreator = async () => {
		// Default to root folder
		let newFileFolderPath = '/';

		// Try to get the current file's parent folder
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.parent) {
			newFileFolderPath = activeFile.parent.path;
		}

		// Ensure path ends with a slash
		if (!newFileFolderPath.endsWith('/')) newFileFolderPath += '/';

		const originalPath = newFileFolderPath;
		newFileFolderPath = newFileFolderPath + 'Untitled.cook';
		let i = 0;
		while (this.app.vault.getAbstractFileByPath(newFileFolderPath)) {
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
			if (leaf.view instanceof CookView) {
				leaf.view.settings = this.settings;
				if (leaf.view.recipe) leaf.view.renderPreview(leaf.view.recipe);
			}
		});
	}

	// this function provides the icon for the document
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
