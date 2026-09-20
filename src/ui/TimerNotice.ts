import { Notice } from 'obsidian';

/** A persistent timer notice with the same cleanup path for every dismissal. */
export class TimerNotice extends Notice {
    private dismissed = false;
    private dismissButton: HTMLButtonElement;

    constructor(label: string, private readonly onDismiss: () => void) {
        const message = document.createDocumentFragment();
        const text = document.createElement('div');
        text.textContent = `Timer "${label}" has finished!`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cook-timer-notice-dismiss';
        button.textContent = 'Dismiss';
        button.setAttribute('aria-label', `Dismiss timer "${label}"`);
        message.append(text, button);

        super(message, 0);
        this.dismissButton = button;
        button.onclick = () => this.hide();
    }

    public hide(): void {
        if (this.dismissed) return;
        this.dismissed = true;
        this.dismissButton.onclick = null;
        this.onDismiss();
        super.hide();
    }
}
