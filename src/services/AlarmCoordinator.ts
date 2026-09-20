import { Howl } from 'howler';
import { TimerNotice } from '../ui/TimerNotice';

/** Shares one alarm across all recipe views while any completion is unacknowledged. */
export class AlarmCoordinator {
    private readonly notices = new Map<string, TimerNotice>();
    private readonly sound: Howl;
    private playbackId: number | undefined;
    private disposed = false;

    constructor(private enabled: boolean, soundUrl: string, volume = 0.3) {
        this.sound = new Howl({ src: [soundUrl], volume, loop: true });
    }

    public notify(timerId: string, label: string): void {
        if (this.disposed || this.notices.has(timerId)) return;
        const notice = new TimerNotice(label, () => {
            this.notices.delete(timerId);
            this.syncPlayback();
        });
        this.notices.set(timerId, notice);
        this.syncPlayback();
    }

    public dismiss(timerId: string): void {
        this.notices.get(timerId)?.hide();
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.syncPlayback();
    }

    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const notice of this.notices.values()) notice.hide();
        this.syncPlayback();
        this.sound.unload();
    }

    private syncPlayback(): void {
        if (!this.disposed && this.enabled && this.notices.size > 0) {
            if (this.playbackId === undefined) this.playbackId = this.sound.play();
        } else if (this.playbackId !== undefined) {
            this.sound.stop(this.playbackId);
            this.playbackId = undefined;
        }
    }
}
