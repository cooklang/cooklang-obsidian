import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('howler', () => ({
    Howl: class {
        play(): void {}
        unload(): void {}
    },
}));

vi.mock('obsidian', () => ({ Notice: vi.fn() }));

import { TimerService, type TimerSnapshot } from './TimerService';

describe('TimerService timer controller', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.stubGlobal('window', { setInterval: globalThis.setInterval });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('publishes countdown state and toggles start, pause, and resume', () => {
        const service = new TimerService(
            { timersTick: false, timersRing: false } as any,
            { tickSoundUrl: 'tick.mp3', alarmSoundUrl: 'alarm.mp3' },
        );
        const snapshots: TimerSnapshot[] = [];
        const unsubscribe = service.subscribe('step-1-timer-1', snapshot => {
            snapshots.push(snapshot);
        });

        service.toggle('step-1-timer-1', 5, 'bake');
        expect(snapshots[snapshots.length - 1]).toMatchObject({ remaining: 5, status: 'running' });
        vi.advanceTimersByTime(2000);

        const [timer] = service.getAllTimers();
        expect(timer.remaining).toBe(3);
        expect(snapshots[snapshots.length - 1]).toMatchObject({ remaining: 3, status: 'running' });

        service.toggle('step-1-timer-1', 5, 'bake');
        expect(timer.isRunning).toBe(false);
        expect(snapshots[snapshots.length - 1]?.status).toBe('paused');
        vi.advanceTimersByTime(2000);
        expect(timer.remaining).toBe(3);

        service.toggle('step-1-timer-1', 5, 'bake');
        expect(timer.isRunning).toBe(true);
        vi.advanceTimersByTime(1000);
        expect(timer.remaining).toBe(2);
        expect(snapshots[snapshots.length - 1]).toMatchObject({ remaining: 2, status: 'running' });
        expect(service.getAllTimers()).toHaveLength(1);

        unsubscribe();
        service.dispose();
    });

    it('marks a completed timer and starts a fresh countdown when toggled again', () => {
        const service = new TimerService(
            { timersTick: false, timersRing: false } as any,
            { tickSoundUrl: 'tick.mp3', alarmSoundUrl: 'alarm.mp3' },
        );

        service.toggle('timer', 1, 'rest');
        vi.advanceTimersByTime(1000);
        expect(service.getSnapshot('timer')).toMatchObject({ remaining: 0, status: 'completed' });

        service.toggle('timer', 1, 'rest');
        expect(service.getSnapshot('timer')).toMatchObject({ remaining: 1, status: 'running' });
        expect(service.getAllTimers()).toHaveLength(2);

        service.dispose();
    });
});
