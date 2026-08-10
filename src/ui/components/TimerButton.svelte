<script lang="ts">
    import { onMount, tick } from 'svelte';
    import type { TimerSnapshot } from '../../services/TimerService';
    import {
        formatTime,
        formatTimerDuration,
        timerRangeStep,
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
    let buttonElement = $state<HTMLButtonElement>();
    let popoverElement = $state<HTMLSpanElement>();
    let sliderElement = $state<HTMLInputElement>();
    let selectorOpen = $state(false);
    let selectorReady = $state(false);
    let selectedSeconds = $state(0);
    let popoverLeft = $state(0);
    let status = $derived(snapshot?.status ?? 'idle');
    let isRange = $derived(duration.minimumSeconds !== duration.maximumSeconds);
    let sliderStep = $derived(timerRangeStep(duration));
    let sliderHelpId = $derived(`cook-timer-range-help-${timerKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
    let displayTime = $derived(snapshot ? formatTime(snapshot.remaining) : formatTimerDuration(duration));
    let action = $derived(status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start');
    let accessibleLabel = $derived(`${action} ${label || 'timer'} (${displayTime})`);

    onMount(() => {
        const unsubscribe = controller.subscribe(timerKey, value => {
            snapshot = value;
        });

        function handleOutsidePointer(event: PointerEvent): void {
            if (!selectorOpen || !(event.target instanceof Node)) return;
            if (buttonElement?.contains(event.target) || popoverElement?.contains(event.target)) return;
            closeSelector(false);
        }

        function handleKeydown(event: KeyboardEvent): void {
            if (selectorOpen && event.key === 'Escape') {
                event.preventDefault();
                closeSelector(true);
            }
        }

        function handleViewportChange(): void {
            if (selectorOpen) positionPopover();
        }

        document.addEventListener('pointerdown', handleOutsidePointer, true);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            unsubscribe();
            document.removeEventListener('pointerdown', handleOutsidePointer, true);
            document.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    });

    function activate(event: MouseEvent): void {
        event.stopPropagation();

        if (status === 'running' || status === 'paused' || !isRange) {
            controller.toggle(timerKey, duration.minimumSeconds, label);
            return;
        }

        openSelector();
    }

    function openSelector(): void {
        selectedSeconds = duration.minimumSeconds;
        selectorReady = false;
        selectorOpen = true;
        void tick().then(() => {
            if (!selectorOpen) return;
            positionPopover();
            selectorReady = true;
            sliderElement?.focus();
        });
    }

    function closeSelector(restoreFocus: boolean): void {
        if (!selectorOpen) return;
        selectorOpen = false;
        selectorReady = false;
        if (restoreFocus) void tick().then(() => buttonElement?.focus());
    }

    function positionPopover(): void {
        if (!buttonElement || !popoverElement) return;

        const margin = 8;
        const buttonRect = buttonElement.getBoundingClientRect();
        const popoverRect = popoverElement.getBoundingClientRect();
        const pane = buttonElement.closest('.view-content, .workspace-leaf-content');
        const paneRect = pane?.getBoundingClientRect();
        const boundaryLeft = paneRect?.left ?? 0;
        const boundaryRight = paneRect?.right ?? window.innerWidth;
        const targetLeft = Math.min(
            Math.max(buttonRect.left, boundaryLeft + margin),
            Math.max(boundaryLeft + margin, boundaryRight - popoverRect.width - margin),
        );
        popoverLeft = targetLeft - buttonRect.left;
    }

    function updateSelection(event: Event): void {
        selectedSeconds = Number((event.currentTarget as HTMLInputElement).value);
    }

    function startSelected(): void {
        if (!selectorOpen) return;
        const seconds = selectedSeconds;
        closeSelector(true);
        controller.toggle(timerKey, seconds, label);
    }

    function handleSliderKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        startSelected();
    }

    function closeFromButton(event: MouseEvent): void {
        event.stopPropagation();
        closeSelector(true);
    }

    function resetTimer(event: MouseEvent): void {
        event.stopPropagation();
        closeSelector(false);
        controller.reset(timerKey);
        void tick().then(() => buttonElement?.focus());
    }

</script>

<span class="cook-timer-range-anchor">
    <span class="cook-timer-chip" class:cook-timer-running={status === 'running'}>
        {#if status === 'running' || status === 'paused'}
            <button
                type="button"
                class="cook-timer-reset-btn"
                aria-label={`Reset ${label || 'timer'} timer`}
                onclick={resetTimer}
            >↺</button>
        {/if}

        <button
            bind:this={buttonElement}
            type="button"
            class="cook-timer-btn"
            aria-label={accessibleLabel}
            aria-pressed={status === 'running'}
            aria-haspopup={isRange ? 'dialog' : undefined}
            aria-expanded={isRange ? selectorOpen : undefined}
            onclick={activate}
        >
            {#if status !== 'running' && status !== 'paused'}
                <span class="cook-timer-icon" aria-hidden="true">⏱</span>
            {/if}
            <span class="cook-amt amount" aria-live="polite">{displayTime}</span>
            {#if label}<span class="cook-timer-name">{label}</span>{/if}
        </button>
    </span>

    {#if selectorOpen}
        <span
            bind:this={popoverElement}
            class="cook-timer-range-popover"
            class:cook-timer-range-ready={selectorReady}
            role="dialog"
            tabindex="-1"
            aria-label={`Choose duration for ${label || 'timer'}`}
            style={`left: ${popoverLeft}px;`}
        >
            <span class="cook-timer-range-header">
                <span class="cook-timer-range-value" aria-live="polite">{formatTime(selectedSeconds)}</span>
                <button
                    type="button"
                    class="cook-timer-range-close"
                    aria-label="Close timer range selector"
                    onclick={closeFromButton}
                >×</button>
            </span>
            <input
                bind:this={sliderElement}
                class="cook-timer-range-slider"
                type="range"
                min={duration.minimumSeconds}
                max={duration.maximumSeconds}
                step={sliderStep}
                value={selectedSeconds}
                aria-label={`Duration for ${label || 'timer'}`}
                aria-valuetext={formatTime(selectedSeconds)}
                aria-describedby={sliderHelpId}
                oninput={updateSelection}
                onpointerup={startSelected}
                onkeydown={handleSliderKeydown}
            />
            <span class="cook-timer-range-bounds" aria-hidden="true">
                <span>{formatTime(duration.minimumSeconds)}</span>
                <span>{formatTime(duration.maximumSeconds)}</span>
            </span>
            <span id={sliderHelpId} class="cook-timer-range-help">
                Release the slider to start. Press Enter when using the keyboard.
            </span>
        </span>
    {/if}
</span>
