import { Component, MarkdownRenderer, Modal, type App } from 'obsidian';

export class ChangelogModal extends Modal {
    private renderComponent: Component | null = null;

    constructor(
        app: App,
        private pluginName: string,
        private version: string,
        private releaseNotes: string,
    ) {
        super(app);
    }

    async onOpen(): Promise<void> {
        this.contentEl.empty();
        this.titleEl.setText(`What's new in ${this.pluginName} ${this.version}`);
        this.modalEl.addClass('cook-changelog-modal');

        const notesEl = this.contentEl.createDiv({ cls: 'cook-changelog markdown-rendered' });
        this.renderComponent = new Component();
        this.renderComponent.load();
        await MarkdownRenderer.render(this.app, this.releaseNotes, notesEl, '', this.renderComponent);
    }

    onClose(): void {
        this.renderComponent?.unload();
        this.renderComponent = null;
        this.contentEl.empty();
    }
}
