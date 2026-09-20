export class Notice {
    readonly noticeEl: HTMLElement;

    constructor(message: string | DocumentFragment, public readonly duration?: number) {
        this.noticeEl = document.createElement('div');
        this.noticeEl.className = 'notice';
        this.noticeEl.append(message);
        document.body.append(this.noticeEl);
        // Obsidian's native click (and mobile swipe) calls the public hide method.
        this.noticeEl.addEventListener('click', () => this.hide());
    }

    hide(): void {
        this.noticeEl.remove();
    }
}
