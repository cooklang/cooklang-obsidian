import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('howler', () => ({
    Howl: class {
        play(): void {}
        unload(): void {}
    },
}));

vi.mock('obsidian', () => ({ Notice: vi.fn() }));

import { TimerService } from './TimerService';

describe('TimerService timer buttons', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('window', { setInterval: globalThis.setInterval });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('pauses on the second click and resumes on the third click', () => {
        const service = new TimerService(
            { timersTick: false, timersRing: false } as any,
            { tickSoundUrl: 'tick.mp3', alarmSoundUrl: 'alarm.mp3' },
        );
        const amount = { textContent: '00:05' };
        const button = {
            onclick: null as (() => void) | null,
            querySelector: () => amount,
        } as unknown as HTMLElement;
        const click = (): void => (button.onclick as (() => void) | null)?.();

        service.attachTimerToButton(button, 5, 'bake');
        click();
        vi.advanceTimersByTime(2000);

        const [timer] = service.getAllTimers();
        expect(timer.remaining).toBe(3);
        expect(amount.textContent).toBe('3s');

        click();
        expect(timer.isRunning).toBe(false);
        vi.advanceTimersByTime(2000);
        expect(timer.remaining).toBe(3);
        expect(amount.textContent).toBe('3s');

        click();
        expect(timer.isRunning).toBe(true);
        vi.advanceTimersByTime(1000);
        expect(timer.remaining).toBe(2);
        expect(amount.textContent).toBe('2s');
        expect(service.getAllTimers()).toHaveLength(1);

        service.dispose();
    });
});
