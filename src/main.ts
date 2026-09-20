import {
  Plugin,
  WorkspaceLeaf,
  addIcon,
  TAbstractFile,
  TFile,
  TFolder,
  Menu,
  MarkdownView,
  MarkdownPostProcessorContext,
  Notice,
  TextFileView,
  parseYaml,
  stringifyYaml,
} from 'obsidian';
import { CookView } from './cookView'
import { CooklangSettings, CookSettingsTab } from './settings'
import { AlarmCoordinator } from './services/AlarmCoordinator';
import alarmMp3 from './alarm.mp3';
import { ObsidianRecipeHost } from './ui/ObsidianRecipeHost';
import changelog from '../CHANGELOG.md';
import { ChangelogModal } from './ui/ChangelogModal';
import { releaseNotesForUpdate } from './utils/releaseNotes';
import { isRecipeFile, newRecipeContent, recipeFormat, recipeConversionPath, RECIPE_FORMATS, type RecipeFormat } from './utils/recipeFiles';
import { RecipeViewRouter } from './services/RecipeViewRouter';
import { convertRecipe, synchronizeRecipeBuffers } from './services/RecipeConversion';
import { RecipeFormatModal } from './ui/RecipeFormatModal';
import { RecipeEmbedChild } from './ui/RecipeEmbedChild';
import { wholeRecipeEmbedRoot, WholeRecipeEmbedRegistry } from './utils/wholeRecipeEmbeds';

export default class CookPlugin extends Plugin {

  settings!: CooklangSettings;
  recipeHost!: ObsidianRecipeHost;
  private alarms!: AlarmCoordinator;
  private router!: RecipeViewRouter<WorkspaceLeaf>;
  private conversions = new Set<TFile>();
  private renderChildren = new Set<RecipeEmbedChild>();
  private disposed = false;

  async onload() {
    super.onload();
    this.register(() => { this.disposed = true; });
    const storedData = await this.loadData();
    const isFirstInstall = storedData == null;
    this.settings = Object.assign(new CooklangSettings(), storedData ?? {});
    if (!RECIPE_FORMATS.includes(this.settings.defaultRecipeFormat)) this.settings.defaultRecipeFormat = 'cook';
    this.alarms = new AlarmCoordinator(this.settings.timersRing, alarmMp3);
    this.register(() => this.alarms.dispose());

    // register a custom icon
    this.addDocumentIcon("cook");

    // register the view and extensions
    this.registerView("cook", this.cookViewCreator);
    this.registerExtensions(["cook"], "cook");

    // Render ```cook / ```cooklang fenced blocks inside markdown notes as a
    // compact, read-only recipe (#73).
    this.recipeHost = new ObsidianRecipeHost(this.app, leaf => this.router.openAsRecipe(leaf));
    this.register(() => {
      for (const child of this.renderChildren) child.unload();
      this.renderChildren.clear();
    });

    const renderRecipeBlock = async (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): Promise<void> => {
      el.empty();
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
      const child = new RecipeEmbedChild(el, el, this.app, file instanceof TFile ? file : null,
        () => this.settings, this.recipeHost, source, () => this.renderChildren.delete(child));
      this.renderChildren.add(child);
      ctx.addChild(child);
      await child.refresh();
    };
    this.registerMarkdownCodeBlockProcessor('cook', renderRecipeBlock);
    this.registerMarkdownCodeBlockProcessor('cooklang', renderRecipeBlock);

    const embeds = new WholeRecipeEmbedRegistry();
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
      if (!(file instanceof TFile) || file.extension !== 'md'
          || !isRecipeFile(file.path, ctx.frontmatter ?? this.app.metadataCache.getFileCache(file)?.frontmatter)) return;
      const root = await wholeRecipeEmbedRoot(el);
      if (!root || this.disposed) return;
      const target = el.ownerDocument.createElement('div');
      target.className = 'cook-whole-recipe';
      const cleanup = () => {
        root.classList.remove('cook-recipe-note-embed');
        target.remove();
      };
      if (!embeds.claim(root, cleanup)) return;
      root.classList.add('cook-recipe-note-embed');
      root.appendChild(target);
      const child = new RecipeEmbedChild(el, target, this.app, file, () => this.settings,
        this.recipeHost, undefined, () => {
          embeds.release(root, cleanup);
          this.renderChildren.delete(child);
        });
      this.renderChildren.add(child);
      ctx.addChild(child);
      await child.refresh();
    });

    this.router = new RecipeViewRouter(
      path => {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) return false;
        if (isRecipeFile(path)) return true;
        const cache = this.app.metadataCache.getFileCache(file);
        return cache ? isRecipeFile(path, cache.frontmatter) : undefined;
      },
      async (leaf, type, path, isCurrent) => {
        if (leaf.view instanceof TextFileView) await leaf.view.save();
        // Saving may yield while the user navigates to another note.
        if (!isCurrent()) return;
        await leaf.setViewState({ type, state: { file: path, mode: type === 'cook' ? 'preview' : 'source', sync: true } });
      },
      error => this.reportError('Could not open recipe', error),
    );
    this.register(() => this.router.dispose());
    const routeLeaves = () => this.app.workspace.iterateAllLeaves(leaf => { void this.router.route(leaf); });
    this.registerEvent(this.app.workspace.on('active-leaf-change', routeLeaves));
    this.registerEvent(this.app.workspace.on('file-open', routeLeaves));
    this.registerEvent(this.app.workspace.on('layout-change', routeLeaves));
    this.registerEvent(this.app.metadataCache.on('changed', routeLeaves));
    this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
      this.app.workspace.iterateAllLeaves(leaf => this.router.rename(leaf, oldPath, file.path));
      routeLeaves();
    }));
    this.app.workspace.onLayoutReady(routeLeaves);

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

        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem(item => item
            .setTitle('Open as Recipe')
            .setIcon('document-cook')
            .onClick(() => this.openAsRecipe(this.app.workspace.getLeaf(), file)));
        }
      })
    );

    this.registerEvent(this.app.workspace.on('editor-menu', (menu, _editor, view) => {
      const file = view.file;
      if (file?.extension === 'md') {
        menu.addItem(item => item
          .setTitle('Open as Recipe')
          .setIcon('document-cook')
          .onClick(() => {
            const leaf = view instanceof MarkdownView ? view.leaf : this.app.workspace.activeLeaf;
            if (leaf) void this.openAsRecipe(leaf, file);
          }));
      }
    }));

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

    this.addCommand({
      id: 'convert-recipe-extension',
      name: 'Convert recipe file format',
      checkCallback: checking => {
        const file = this.app.workspace.getActiveFile();
        const leaf = this.app.workspace.activeLeaf;
        if (!file || !leaf) return false;
        const format = recipeFormat(file.path);
        if (!format || !(isRecipeFile(file.path, this.app.metadataCache.getFileCache(file)?.frontmatter)
            || leaf.view instanceof CookView)) return false;
        if (!checking) new RecipeFormatModal(this.app, format, target => {
          void this.convertFile(file, leaf, target);
        }).open();
        return true;
      },
    });

    this.addCommand({
      id: 'edit-as-markdown',
      name: 'Edit as Markdown',
      checkCallback: checking => {
        const leaf = this.app.workspace.activeLeaf;
        if (!leaf || !(leaf.view instanceof CookView) || leaf.view.file?.extension !== 'md') return false;
        if (!checking) void this.editAsMarkdown(leaf);
        return true;
      },
    });

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
        
        void this.openAsRecipe(leaf, file);
        return true;
      }
    });

    await this.showReleaseNotesAfterUpdate(isFirstInstall);
  }

  private reportError(message: string, error: unknown): void {
    console.error(message, error);
    new Notice(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  }

  private async openAsRecipe(leaf: WorkspaceLeaf, file: TFile): Promise<void> {
    this.router.openAsRecipe(leaf);
    try {
      await leaf.setViewState({ type: 'cook', state: { file: file.path, mode: 'preview' } });
    } catch (error) {
      this.reportError('Could not open recipe', error);
    }
  }

  private editAsMarkdown = async (leaf: WorkspaceLeaf): Promise<void> => {
    const view = leaf.view;
    if (!(view instanceof CookView) || view.file?.extension !== 'md') return;
    const file = view.file;
    try {
      await view.save();
      if (leaf.view !== view || view.file !== file) return;
      this.router.editAsMarkdown(leaf, file.path);
      await leaf.setViewState({ type: 'markdown', state: { file: file.path, mode: 'source', sync: true } });
    } catch (error) {
      this.router.openAsRecipe(leaf);
      this.reportError('Could not edit as Markdown', error);
    }
  };

  private async convertFile(file: TFile, leaf: WorkspaceLeaf, target: RecipeFormat): Promise<void> {
    if (this.conversions.has(file)) return;
    const originalPath = file.path;
    this.conversions.add(file);
    this.router.suspend(originalPath);
    // Both names are suspended because rename events fire before renameFile resolves.
    const destination = recipeConversionPath(originalPath, target);
    this.router.suspend(destination);
    const openViews = (): TextFileView[] => {
      const views: TextFileView[] = [];
      this.app.workspace.iterateAllLeaves(openLeaf => {
        if (openLeaf.view instanceof TextFileView && openLeaf.view.file === file) views.push(openLeaf.view);
      });
      return views;
    };
    try {
      await convertRecipe({
        path: () => file.path,
        exists: path => this.app.vault.getAbstractFileByPath(path) !== null,
        save: async () => {
          const views = openViews();
          const contents = new Set(views.map(view => view.getViewData()));
          if (contents.size > 1) throw new Error('Open editors disagree. Save your edits before converting.');
          for (const view of views) await view.save();
        },
        read: () => this.app.vault.read(file),
        process: async update => {
          await this.app.vault.process(file, current => {
            if (openViews().some(view => view.getViewData() !== current)) {
              throw new Error('An open editor changed during conversion. Please save it and try again.');
            }
            return update(current);
          });
        },
        synchronize: (previous, next) => synchronizeRecipeBuffers(openViews().map(view => ({
          read: () => view.file === file ? view.getViewData() : next,
          replace: content => view.setViewData(content, false),
        })), previous, next),
        rename: path => this.app.fileManager.renameFile(file, path),
        // An empty append with a newer mtime sends Obsidian a real modify event
        // without rewriting content or overwriting concurrent editor changes.
        refreshMetadata: () => this.app.vault.append(file, '', {
          mtime: Math.max(Date.now(), file.stat.mtime + 1),
        }),
      }, target, { parse: parseYaml, stringify: stringifyYaml });
      const currentPath = leaf.getViewState().state?.file;
      if (currentPath === originalPath || currentPath === file.path) await this.openAsRecipe(leaf, file);
      new Notice(`Recipe converted to ${file.path}`);
    } catch (error) {
      this.reportError(`Conversion failed; recipe is at ${file.path}`, error);
    } finally {
      this.conversions.delete(file);
      this.router.resume(originalPath);
      this.router.resume(destination);
      this.app.workspace.iterateAllLeaves(openLeaf => { void this.router.route(openLeaf); });
    }
  }

  private async showReleaseNotesAfterUpdate(isFirstInstall: boolean): Promise<void> {
    const currentVersion = this.manifest.version;
    const previousVersion = this.settings.lastSeenVersion;

    if (previousVersion === currentVersion) return;

    this.settings.lastSeenVersion = currentVersion;
    try {
      await this.saveData(this.settings);
    } catch (error) {
      console.error('Could not save the Cooklang release-notes version.', error);
    }

    const notes = releaseNotesForUpdate(
      changelog,
      currentVersion,
      previousVersion,
      isFirstInstall,
    );
    if (!notes) return;

    this.app.workspace.onLayoutReady(() => {
      new ChangelogModal(
        this.app,
        this.manifest.name,
        currentVersion,
        notes,
      ).open();
    });
  }

  cookFileCreator = async (folderPath?: string) => {
    // Default to root folder
    let newFileFolderPath = '';

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
    if (newFileFolderPath === '/') newFileFolderPath = '';
    if (newFileFolderPath && !newFileFolderPath.endsWith('/')) newFileFolderPath += '/';

    const originalPath = newFileFolderPath;
    const format = this.settings.defaultRecipeFormat;
    newFileFolderPath = `${newFileFolderPath}Untitled.${format}`;
    let i = 0;
    while(this.app.vault.getAbstractFileByPath(newFileFolderPath)) {
      newFileFolderPath = `${originalPath}Untitled ${++i}.${format}`;
    }
    const newFile = await this.app.vault.create(newFileFolderPath, newRecipeContent(format));
    return newFile;
  }

  // function to create the view
  cookViewCreator = (leaf: WorkspaceLeaf) => {
    return new CookView(leaf, this.settings, this.alarms, this.editAsMarkdown,
      target => this.router.openAsRecipe(target));
  }

  reloadCookViews() {
    this.alarms.setEnabled(this.settings.timersRing);
    this.app.workspace.getLeavesOfType('cook').forEach(leaf => {
      if(leaf.view instanceof CookView) {
        leaf.view.updateSettings(this.settings);
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
