/**
 * Timer Service - Manages recipe timers and audio playback
 *
 * This service handles countdown timers and audio notifications
 * for recipe timing. Provides a clean API for creating, starting,
 * and managing timers with sound effects.
 */

import { Howl } from 'howler';
import { Notice } from 'obsidian';
import { formatTime } from '../utils/timeFormatters';

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
    private tickSound: Howl;
    private alarmSound: Howl;

    /**
     * Create a new TimerService
     * @param config - Configuration with sound URLs and volumes
     */
    constructor(config: TimerServiceConfig) {
        this.tickSound = new Howl({
            src: [config.tickSoundUrl],
            volume: config.tickVolume ?? 0.3
        });

        this.alarmSound = new Howl({
            src: [config.alarmSoundUrl],
            volume: config.alarmVolume ?? 0.3
        });
    }

    /**
     * Create a timer button with countdown functionality
     * @param button - HTML button element to attach timer to
     * @param seconds - Duration in seconds
     * @param name - Timer name/label
     */
    public attachTimerToButton(button: HTMLElement, seconds: number, name: string): void {
        button.onclick = () => {
            this.startTimer(seconds, name, (remaining) => {
                const span = button.querySelector('.amount');
                if (span) {
                    span.textContent = formatTime(remaining);
                }
            });
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
        onTick: (remaining: number) => void
    ): string {
        const timerId = this.generateTimerId();
        let remaining = seconds;

        // Play tick sound when timer starts
        this.playTick();

        const intervalId = window.setInterval(() => {
            remaining--;
            onTick(remaining);

            if (remaining <= 0) {
                this.stopTimer(timerId);
                this.playAlarm();
                new Notice(`Timer "${name}" has finished!`, 5000);
            }
        }, 1000);

        const timer: Timer = {
            id: timerId,
            duration: seconds,
            remaining,
            label: name,
            isRunning: true,
            intervalId
        };

        this.timers.set(timerId, timer);
        return timerId;
    }

    /**
     * Stop a running timer
     * @param timerId - ID of timer to stop
     */
    public stopTimer(timerId: string): void {
        const timer = this.timers.get(timerId);
        if (timer && timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.isRunning = false;
        }
    }

    /**
     * Pause a running timer
     * @param timerId - ID of timer to pause
     */
    public pauseTimer(timerId: string): void {
        const timer = this.timers.get(timerId);
        if (timer && timer.isRunning && timer.intervalId) {
            clearInterval(timer.intervalId);
            timer.isRunning = false;
            timer.intervalId = undefined;
        }
    }

    /**
     * Resume a paused timer
     * @param timerId - ID of timer to resume
     * @param onTick - Callback for timer updates
     */
    public resumeTimer(timerId: string, onTick: (remaining: number) => void): void {
        const timer = this.timers.get(timerId);
        if (!timer || timer.isRunning) return;

        const intervalId = window.setInterval(() => {
            if (timer.remaining > 0) {
                timer.remaining--;
                onTick(timer.remaining);

                if (timer.remaining <= 0) {
                    this.stopTimer(timerId);
                    this.playAlarm();
                    new Notice(`Timer "${timer.label}" has finished!`, 5000);
                }
            }
        }, 1000);

        timer.intervalId = intervalId;
        timer.isRunning = true;
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

    /**
     * Play tick sound
     */
    public playTick(): void {
        this.tickSound.play();
    }

    /**
     * Play alarm sound
     */
    public playAlarm(): void {
        this.alarmSound.play();
    }

    /**
     * Stop all timers and clean up
     */
    public dispose(): void {
        // Stop all running timers
        for (const timer of this.timers.values()) {
            if (timer.intervalId) {
                clearInterval(timer.intervalId);
            }
        }
        this.timers.clear();

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
}
