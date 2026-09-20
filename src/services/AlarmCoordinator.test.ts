// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Notice } from 'obsidian';
import { Howl } from 'howler';
import { AlarmCoordinator } from './AlarmCoordinator';
import { TimerService } from './TimerService';

vi.mock('howler', () => ({
    Howl: vi.fn(class {
        play = vi.fn(() => 42);
        stop = vi.fn();
        unload = vi.fn();
    }),
}));

describe('shared completion alarms', () => {
    let alarms: AlarmCoordinator;
    let sound: Howl;
    let services: TimerService[];

    function createService(): TimerService {
        const service = new TimerService({ timersTick: false }, { tickSoundUrl: 'tick.mp3' }, alarms);
        services.push(service);
        return service;
    }

    function notices(): HTMLElement[] {
        return Array.from(document.querySelectorAll<HTMLElement>('.notice'));
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        alarms = new AlarmCoordinator(true, 'alarm.mp3');
        sound = vi.mocked(Howl).mock.results[0].value;
        services = [];
    });

    afterEach(() => {
        for (const service of services) service.dispose();
        alarms.dispose();
        document.body.replaceChildren();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('keeps a notice and one looping alarm until the Dismiss button is clicked', () => {
        const hide = vi.spyOn(Notice.prototype, 'hide');
        const service = createService();
        service.toggle('rest', 1, 'rest');
        vi.advanceTimersByTime(1000);

        expect(Howl).toHaveBeenCalledWith({ src: ['alarm.mp3'], volume: 0.3, loop: true });
        expect(notices()[0].textContent).toBe('Timer "rest" has finished!Dismiss');
        // Advancing beyond the old timeout must neither hide nor replay the alarm.
        vi.advanceTimersByTime(60_000);
        expect(notices()).toHaveLength(1);
        expect(sound.play).toHaveBeenCalledTimes(1);
        expect(sound.stop).not.toHaveBeenCalled();

        const button = notices()[0].querySelector('button')!;
        expect(button.type).toBe('button');
        expect(button.getAttribute('aria-label')).toBe('Dismiss timer "rest"');
        button.click();
        expect(notices()).toHaveLength(0);
        expect(sound.stop).toHaveBeenCalledExactlyOnceWith(42);
        // The button click also bubbles to native dismissal; cleanup runs once.
        expect(hide).toHaveBeenCalledTimes(1);
        expect(service.getSnapshot('rest')?.status).toBe('completed');
    });

    it('shares playback across recipe views until every native notice is dismissed', () => {
        const first = createService();
        const second = createService();
        first.toggle('same-control-key', 1, 'first');
        second.toggle('same-control-key', 1, 'second');
        vi.advanceTimersByTime(1000);
        expect(notices()).toHaveLength(2);
        expect(sound.play).toHaveBeenCalledTimes(1);

        notices()[0].click();
        expect(notices()).toHaveLength(1);
        expect(sound.stop).not.toHaveBeenCalled();
        notices()[0].click();
        expect(notices()).toHaveLength(0);
        expect(sound.stop).toHaveBeenCalledTimes(1);

        first.toggle('same-control-key', 1, 'first');
        vi.advanceTimersByTime(1000);
        expect(sound.play).toHaveBeenCalledTimes(2);
    });

    it('creates persistent notices with sound disabled and reconciles setting changes', () => {
        alarms.setEnabled(false);
        alarms.notify('timer', 'silent');
        expect(notices()).toHaveLength(1);
        expect(sound.play).not.toHaveBeenCalled();
        alarms.setEnabled(true);
        alarms.setEnabled(true);
        expect(sound.play).toHaveBeenCalledTimes(1);
        alarms.setEnabled(false);
        expect(sound.stop).toHaveBeenCalledTimes(1);
        expect(notices()).toHaveLength(1);
        alarms.setEnabled(true);
        expect(sound.play).toHaveBeenCalledTimes(2);
        notices()[0].click();
        expect(sound.stop).toHaveBeenCalledTimes(2);
        alarms.setEnabled(false);
        alarms.setEnabled(true);
        expect(sound.play).toHaveBeenCalledTimes(2);
    });

    it.each(['reset', 'resetTimer', 'stopTimer', 'restart'] as const)(
        'acknowledges a completed timer on %s', action => {
            const service = createService();
            service.toggle('timer', 1, 'rest');
            vi.advanceTimersByTime(1000);
            const timerId = service.getSnapshot('timer')!.id;
            if (action === 'restart') service.toggle('timer', 1, 'rest');
            else if (action === 'reset') service.reset('timer');
            else service[action](timerId);
            expect(notices()).toHaveLength(0);
            expect(sound.stop).toHaveBeenCalledTimes(1);
        },
    );

    it('clears only the closing view’s alerts and keeps the other view ringing', () => {
        const first = createService();
        const second = createService();
        first.toggle('a', 1, 'first');
        second.toggle('b', 1, 'second');
        vi.advanceTimersByTime(1000);
        first.dispose();
        expect(notices()).toHaveLength(1);
        expect(notices()[0].textContent).toContain('second');
        expect(sound.stop).not.toHaveBeenCalled();
        expect(sound.unload).not.toHaveBeenCalled();
        second.dispose();
        expect(notices()).toHaveLength(0);
        expect(sound.stop).toHaveBeenCalledTimes(1);
    });

    it('unloads all alerts once and ignores later completions after plugin disposal', () => {
        const service = createService();
        service.toggle('a', 1, 'first');
        service.toggle('b', 1, 'second');
        service.toggle('c', 10, 'later');
        vi.advanceTimersByTime(1000);
        alarms.dispose();
        alarms.dispose();
        vi.advanceTimersByTime(10_000);
        alarms.setEnabled(true);
        service.dispose();
        expect(notices()).toHaveLength(0);
        expect(sound.stop).toHaveBeenCalledTimes(1);
        expect(sound.unload).toHaveBeenCalledTimes(1);
        expect(sound.play).toHaveBeenCalledTimes(1);
    });

    it('reconciles a suspended countdown without duplicate completion alerts', () => {
        const service = createService();
        service.toggle('timer', 5, 'rest');
        vi.setSystemTime(Date.now() + 10_000);
        document.dispatchEvent(new Event('visibilitychange'));
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(1000);
        expect(notices()).toHaveLength(1);
        expect(sound.play).toHaveBeenCalledTimes(1);
        const timerId = service.getSnapshot('timer')!.id;
        alarms.notify(timerId, 'rest');
        expect(notices()).toHaveLength(1);
        notices()[0].click();
        service.resumeTimer(timerId);
        document.dispatchEvent(new Event('visibilitychange'));
        vi.advanceTimersByTime(1000);
        expect(notices()).toHaveLength(0);
        expect(sound.play).toHaveBeenCalledTimes(1);
    });

    it('does not leave an orphaned alert when a completion subscriber resets the timer', () => {
        const service = createService();
        service.subscribe('timer', snapshot => {
            if (snapshot?.status === 'completed') service.reset('timer');
        });
        service.toggle('timer', 1, 'rest');
        vi.advanceTimersByTime(1000);
        expect(service.getSnapshot('timer')).toBeNull();
        expect(notices()).toHaveLength(0);
        expect(sound.stop).toHaveBeenCalledTimes(1);
    });
});
