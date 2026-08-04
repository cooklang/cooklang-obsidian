import { Plugin, WorkspaceLeaf, addIcon, TAbstractFile, TFile, TFolder, Menu, MarkdownPostProcessorContext } from 'obsidian';
import { CookView } from './cookView'
import { CooklangSettings, CookSettingsTab } from './settings'
import alarmMp3 from './alarm.mp3';
import timerMp3 from './timer.mp3';
import { parserService } from './services/ParserService';
import { TimerService } from './services/TimerService';
import { MarkdownRecipeRenderer } from './renderers/MarkdownRecipeRenderer';

export default class CookPlugin extends Plugin {

  settings!: CooklangSettings;
  embedTimerService!: TimerService;
  markdownRecipeRenderer!: MarkdownRecipeRenderer;

  async onload() {
    super.onload();
    this.settings = Object.assign(new CooklangSettings(), await this.loadData());

    // register a custom icon
    this.addDocumentIcon("cook");

    // register the view and extensions
    this.registerView("cook", this.cookViewCreator);
    this.registerExtensions(["cook"], "cook");

    // Render ```cook / ```cooklang fenced blocks inside markdown notes as a
    // compact, read-only recipe (#73).
    this.embedTimerService = new TimerService(this.settings, {
      tickSoundUrl: timerMp3,
      alarmSoundUrl: alarmMp3,
      tickVolume: 0.3,
      alarmVolume: 0.3,
    });
    this.register(() => this.embedTimerService.dispose());
    this.markdownRecipeRenderer = new MarkdownRecipeRenderer(this.app, this.embedTimerService);

    const renderRecipeBlock = async (
      source: string,
      el: HTMLElement,
      ctx: MarkdownPostProcessorContext,
    ): Promise<void> => {
      if (!source.trim()) {
        el.empty();
        el.createDiv({ cls: 'cook-embed-empty', text: 'Empty recipe block.' });
        return;
      }
      try {
        await parserService.initialize();
      } catch (e) {
        renderEmbedError(el, source, 'Cooklang parser failed to load.');
        return;
      }
      let recipe;
      try {
        [recipe] = parserService.parse(source);
      } catch (e) {
        renderEmbedError(el, source, 'Could not parse this recipe.');
        return;
      }
      const abstract = ctx.sourcePath
        ? this.app.vault.getAbstractFileByPath(ctx.sourcePath)
        : null;
      const file = abstract instanceof TFile ? abstract : null;
      this.markdownRecipeRenderer.render(el, file, recipe, this.settings);
    };

    this.registerMarkdownCodeBlockProcessor('cook', renderRecipeBlock);
    this.registerMarkdownCodeBlockProcessor('cooklang', renderRecipeBlock);

    // Auto-detect recipe files by frontmatter (recipe: true)
    this.registerEvent(
      this.app.workspace.on('active-leaf-change', (leaf) => {
        if (!leaf) return;
        
        const state = leaf.getViewState();
        
        // Only process markdown views
        if (state.type === 'markdown' && state.state?.file && typeof state.state.file === 'string') {
          const file = this.app.vault.getAbstractFileByPath(state.state.file);
          
          if (file instanceof TFile && file.extension === 'md') {
            // Check frontmatter for recipe: true
            const metadata = this.app.metadataCache.getFileCache(file);
            const isRecipe = metadata?.frontmatter?.recipe === true;
            
            if (isRecipe) {
              // Switch to cook view in preview mode
              setTimeout(() => {
                if (leaf.view.getViewType() === 'markdown') {
                  leaf.setViewState({
                    type: 'cook',
                    state: { 
                      file: file.path,
                      mode: 'preview',
                      // Do not add the transient markdown view to navigation
                      // history; Back should return to the note opened before it.
                      sync: true
                    }
                  });
                }
              }, 50);
            }
          }
        }
      })
    );

    this.addSettingTab(new CookSettingsTab(this.app, this));

    // Register file explorer context menu
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
        if (file instanceof TFolder) {
          // Add "New recipe" option for folders
          menu.addItem((item) => {
            item
              .setTitle('New recipe')
              .setIcon('document-cook')
              .setSection('action-primary')
              .onClick(async () => {
                const folderPath = file.path;
                const newFile = await this.cookFileCreator(folderPath);
                this.app.workspace.getLeaf().openFile(newFile);
              });
          });
        }

        // Add "Open as Recipe" option for .md files
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('Open as Recipe')
              .setIcon('document-cook')
              .onClick(() => {
                const leaf = this.app.workspace.getLeaf();
                leaf.openFile(file).then(() => {
                  leaf.setViewState({
                    type: 'cook',
                    state: { 
                      file: file.path,
                      mode: 'preview'
                    }
                  });
                });
              });
          });
        }
      })
    );

    // Register editor context menu (right-click inside open file)
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor, view) => {
        const file = view.file;
        if (file && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('Open as Recipe')
              .setIcon('document-cook')
              .onClick(() => {
                const leaf = this.app.workspace.activeLeaf;
                if (leaf) {
                  leaf.setViewState({
                    type: 'cook',
                    state: { 
                      file: file.path,
                      mode: 'preview'
                    }
                  });
                }
              });
          });
        }
      })
    );

    // commands:
    // - Create new recipe
    // - Create recipe in new pane
    // - Convert markdown file to `.cook`
    // - Toggle preview recipe

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

    // register the convert command (bidirectional: .md <-> .cook)
    this.addCommand({
      id: "convert-recipe-extension",
      name: "Convert recipe file extension (.md ↔ .cook)",
      checkCallback: (checking:boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        const isMd = file.extension === "md";
        const isCook = file.extension === "cook";
        
        if(checking) {
          // Show command for both .md and .cook files
          return isCook || isMd;
        }
        else if(isMd) {
          // Convert .md to .cook
          this.app.vault.rename(file, file.path.replace(/\.md$/, ".cook")).then(() => {
            const renamedFile = this.app.vault.getAbstractFileByPath(file.path.replace(/\.md$/, ".cook"));
            if (renamedFile && renamedFile instanceof TFile) {
              this.app.workspace.getLeaf().openFile(renamedFile);
            }
          });
        }
        else if(isCook) {
          // Convert .cook to .md
          this.app.vault.rename(file, file.path.replace(/\.cook$/, ".md")).then(() => {
            const renamedFile = this.app.vault.getAbstractFileByPath(file.path.replace(/\.cook$/, ".md"));
            if (renamedFile && renamedFile instanceof TFile) {
              this.app.workspace.getLeaf().openFile(renamedFile);
            }
          });
        }
      }
    })

    this.addCommand({
      id: "toggle-preview-recipe",
      name: "Toggle preview recipe",
      callback: () => {
        const { workspace } = this.app;

        const activeLeaf = workspace.activeLeaf || workspace.getLeaf();
        if (activeLeaf && activeLeaf.view instanceof CookView) {
          activeLeaf.view.switchMode();
        }
      },
    });

    this.addCommand({
      id: "open-as-recipe",
      name: "Open current file as recipe",
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        const leaf = this.app.workspace.activeLeaf;
        
        if (!file || !leaf || file.extension !== 'md') return false;
        
        // Only show if currently in markdown view
        if (checking) return leaf.view.getViewType() === 'markdown';
        
        // Switch to cook view in preview mode
        leaf.setViewState({
          type: 'cook',
          state: { 
            file: file.path,
            mode: 'preview'
          }
        });
      }
    });
  }

  cookFileCreator = async (folderPath?: string) => {
    // Default to root folder
    let newFileFolderPath = '/';

    // Use provided folder path, or try to get the current file's parent folder
    if (folderPath) {
      newFileFolderPath = folderPath;
    } else {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile && activeFile.parent) {
        newFileFolderPath = activeFile.parent.path;
      }
    }

    // Ensure path ends with a slash
    if(!newFileFolderPath.endsWith('/')) newFileFolderPath += '/';

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
        if(leaf.view.rawRecipe) leaf.view.renderPreview();
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

function renderEmbedError(el: HTMLElement, source: string, message: string): void {
  el.empty();
  const wrap = el.createDiv({ cls: 'cook-embed-error' });
  wrap.createDiv({ cls: 'cook-embed-error-msg', text: message });
  wrap.createEl('pre').createEl('code', { text: source });
}
