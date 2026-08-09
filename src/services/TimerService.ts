/**
 * Timer Service - Manages recipe timers and audio playback
 *
 * This service handles countdown timers and audio notifications
 * for recipe timing. Provides a clean API for creating, starting,
 * and managing timers with sound effects.
 */

import { Howl } from 'howler';
import { Notice } from 'obsidian';
import type { CooklangSettings } from '../settings';

/**
 * Timer state data
 */
export interface Timer {
    id: string;
    duration: number;
    remaining: number;
    label: string;
    isRunning: boolean;
    intervalId?: number;
}

export type TimerStatus = 'running' | 'paused' | 'completed';

export interface TimerSnapshot {
    id: string;
    duration: number;
    remaining: number;
    label: string;
    status: TimerStatus;
}

/**
 * Configuration for TimerService
 */
export interface TimerServiceConfig {
    tickSoundUrl: string;
    alarmSoundUrl: string;
    tickVolume?: number;
    alarmVolume?: number;
}

/**
 * TimerService - Manages countdown timers and audio notifications
 */
export class TimerService {
    private timers: Map<string, Timer> = new Map();
    private timerIdsByKey: Map<string, string> = new Map();
    private keysByTimerId: Map<string, string> = new Map();
    private listeners: Map<string, Set<(snapshot: TimerSnapshot) => void>> = new Map();
    private tickSound: Howl;
    private alarmSound: Howl;

    /**
     * Create a new TimerService
     * @param settings - Plugin settings
     * @param config - Configuration with sound URLs and volumes
     */
    constructor(private settings: CooklangSettings, config: TimerServiceConfig) {
        this.tickSound = new Howl({
            src: [config.tickSoundUrl],
            volume: config.tickVolume ?? 0.3
        });

        this.alarmSound = new Howl({
            src: [config.alarmSoundUrl],
            volume: config.alarmVolume ?? 0.3
        });
    }

    public toggle(key: string, seconds: number, label: string): void {
        const timerId = this.timerIdsByKey.get(key);
        const timer = timerId ? this.timers.get(timerId) : undefined;
        if (timer?.isRunning) {
            this.pauseTimer(timer.id);
            return;
        }
        if (timer && timer.remaining > 0) {
            this.resumeTimer(timer.id);
            return;
        }
        this.startTimer(seconds, label, undefined, key);
    }

    public subscribe(key: string, listener: (snapshot: TimerSnapshot) => void): () => void {
        let listeners = this.listeners.get(key);
        if (!listeners) {
            listeners = new Set();
            this.listeners.set(key, listeners);
        }
        listeners.add(listener);

        const timerId = this.timerIdsByKey.get(key);
        const timer = timerId ? this.timers.get(timerId) : undefined;
        if (timer) listener(this.snapshot(timer));

        return () => {
            const current = this.listeners.get(key);
            current?.delete(listener);
            if (current?.size === 0) this.listeners.delete(key);
        };
    }

    /**
     * Start a countdown timer
     * @param seconds - Duration in seconds
     * @param name - Timer name/label
     * @param onTick - Callback fired every second with remaining time
     * @returns Timer ID for managing the timer
     */
    public startTimer(
        seconds: number,
        name: string,
        onTick: (remaining: number) => void = () => {},
        key?: string,
    ): string {
        const timer: Timer = {
            id: this.generateTimerId(),
            duration: seconds,
            remaining: seconds,
            label: name,
            isRunning: true
        };

        // Play tick sound when timer starts
        this.playTick();

        const intervalId = window.setInterval(() => {
            timer.remaining = Math.max(0, timer.remaining - 1);
            onTick(timer.remaining);
            this.notifyTimer(timer.id);

            if (timer.remaining <= 0) {
                this.stopTimer(timer.id);
                this.playAlarm();
                new Notice(`Timer "${name}" has finished!`, 5000);
            }
        }, 1000);

        timer.intervalId = intervalId;
        this.timers.set(timer.id, timer);
        if (key) {
            const previousId = this.timerIdsByKey.get(key);
            if (previousId) this.keysByTimerId.delete(previousId);
            this.timerIdsByKey.set(key, timer.id);
            this.keysByTimerId.set(timer.id, key);
        }
        this.notifyTimer(timer.id);
        return timer.id;
    }

    /**
     * Stop a running timer
     * @param timerId - ID of timer to stop
     */
    public stopTimer(timerId: string): void {
        const timer = this.timers.get(timerId);
        if (timer && timer.intervalId !== undefined) {
            clearInterval(timer.intervalId);
            timer.isRunning = false;
            timer.intervalId = undefined;
            this.notifyTimer(timerId);
        }
    }

    /**
     * Pause a running timer
     * @param timerId - ID of timer to pause
     */
    public pauseTimer(timerId: string): void {
        const timer = this.timers.get(timerId);
        if (timer && timer.isRunning && timer.intervalId !== undefined) {
            clearInterval(timer.intervalId);
            timer.isRunning = false;
            timer.intervalId = undefined;
            this.notifyTimer(timerId);
        }
    }

    /**
     * Resume a paused timer
     * @param timerId - ID of timer to resume
     * @param onTick - Callback for timer updates
     */
    public resumeTimer(timerId: string, onTick: (remaining: number) => void = () => {}): void {
        const timer = this.timers.get(timerId);
        if (!timer || timer.isRunning) return;

        const intervalId = window.setInterval(() => {
            if (timer.remaining > 0) {
                timer.remaining--;
                onTick(timer.remaining);
                this.notifyTimer(timerId);

                if (timer.remaining <= 0) {
                    this.stopTimer(timerId);
                    this.playAlarm();
                    new Notice(`Timer "${timer.label}" has finished!`, 5000);
                }
            }
        }, 1000);

        timer.intervalId = intervalId;
        timer.isRunning = true;
        this.notifyTimer(timerId);
    }

    /**
     * Reset a timer to its original duration
     * @param timerId - ID of timer to reset
     */
    public resetTimer(timerId: string): void {
        const timer = this.timers.get(timerId);
        if (timer) {
            this.stopTimer(timerId);
            timer.remaining = timer.duration;
            timer.isRunning = false;
            this.notifyTimer(timerId);
        }
    }

    /**
     * Get timer state
     * @param timerId - ID of timer
     * @returns Timer object or undefined if not found
     */
    public getTimer(timerId: string): Timer | undefined {
        return this.timers.get(timerId);
    }

    /**
     * Get all active timers
     * @returns Array of all timers
     */
    public getAllTimers(): Timer[] {
        return Array.from(this.timers.values());
    }

    public getSnapshot(key: string): TimerSnapshot | null {
        const timerId = this.timerIdsByKey.get(key);
        const timer = timerId ? this.timers.get(timerId) : undefined;
        return timer ? this.snapshot(timer) : null;
    }

    /**
     * Play tick sound
     */
    public playTick(): void {
        if (this.settings.timersTick) this.tickSound.play();
    }

    /**
     * Play alarm sound
     */
    public playAlarm(): void {
        if (this.settings.timersRing) this.alarmSound.play();
    }

    /**
     * Stop all timers and clean up
     */
    public dispose(): void {
        // Stop all running timers
        for (const timer of this.timers.values()) {
            if (timer.intervalId !== undefined) {
                clearInterval(timer.intervalId);
            }
        }
        this.timers.clear();
        this.timerIdsByKey.clear();
        this.keysByTimerId.clear();
        this.listeners.clear();

        // Unload sounds
        this.tickSound.unload();
        this.alarmSound.unload();
    }

    /**
     * Generate unique timer ID
     */
    private generateTimerId(): string {
        return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private notifyTimer(timerId: string): void {
        const key = this.keysByTimerId.get(timerId);
        const timer = this.timers.get(timerId);
        if (!key || !timer) return;
        const snapshot = this.snapshot(timer);
        for (const listener of this.listeners.get(key) ?? []) listener(snapshot);
    }

    private snapshot(timer: Timer): TimerSnapshot {
        return {
            id: timer.id,
            duration: timer.duration,
            remaining: timer.remaining,
            label: timer.label,
            status: timer.isRunning
                ? 'running'
                : timer.remaining <= 0
                    ? 'completed'
                    : 'paused',
        };
    }
}
