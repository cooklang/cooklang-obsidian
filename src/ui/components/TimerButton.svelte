<script lang="ts">
    import { onMount } from 'svelte';
    import type { TimerSnapshot } from '../../services/TimerService';
    import {
        formatTime,
        formatTimerDuration,
        type TimerDuration,
    } from '../../utils/timeFormatters';
    import type { TimerController } from '../types';

    let {
        controller,
        timerKey,
        duration,
        label,
    }: {
        controller: TimerController;
        timerKey: string;
        duration: TimerDuration;
        label: string;
    } = $props();

    let snapshot = $state<TimerSnapshot | null>(null);
    let status = $derived(snapshot?.status ?? 'idle');
    let displayTime = $derived(snapshot ? formatTime(snapshot.remaining) : formatTimerDuration(duration));
    let action = $derived(status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start');
    let accessibleLabel = $derived(`${action} ${label || 'timer'} (${displayTime})`);

    onMount(() => controller.subscribe(timerKey, value => {
        snapshot = value;
    }));

    function toggle(event: MouseEvent): void {
        event.stopPropagation();
        controller.toggle(timerKey, duration.minimumSeconds, label);
    }
</script>

<button
    type="button"
    class="cook-timer-btn"
    aria-label={accessibleLabel}
    aria-pressed={status === 'running'}
    onclick={toggle}
>
    <span aria-hidden="true">⏱</span>{' '}
    <span class="cook-amt amount" aria-live="polite">{displayTime}</span>
    {#if label}<span class="cook-timer-name">{label}</span>{/if}
</button>
