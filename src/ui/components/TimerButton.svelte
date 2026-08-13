<script lang="ts">
    import { onMount, tick } from 'svelte';
    import type { TimerSnapshot } from '../../services/TimerService';
    import {
        formatTime,
        formatTimerDuration,
        timerRangeMidpoint,
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
    let pendingPointerStart: number | undefined;
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
            if (pendingPointerStart !== undefined) window.clearTimeout(pendingPointerStart);
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
        selectedSeconds = timerRangeMidpoint(duration);
        selectorReady = false;
        selectorOpen = true;
        void tick().then(() => {
            if (!selectorOpen) return;
            positionPopover();
            selectorReady = true;
            focusWithoutScrolling(sliderElement);
        });
    }

    function closeSelector(restoreFocus: boolean): void {
        if (!selectorOpen) return;
        if (pendingPointerStart !== undefined) {
            window.clearTimeout(pendingPointerStart);
            pendingPointerStart = undefined;
        }
        selectorOpen = false;
        selectorReady = false;
        if (restoreFocus) void tick().then(() => focusWithoutScrolling(buttonElement));
    }

    function focusWithoutScrolling(element?: HTMLElement): void {
        if (!element) return;
        try {
            element.focus({ preventScroll: true });
        } catch {
            element.focus();
        }
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

    function ownPointerStream(slider: HTMLInputElement): { destroy: () => void } {
        slider.addEventListener('pointerdown', handleSliderPointerDown);
        slider.addEventListener('pointermove', handleSliderPointerMove);
        slider.addEventListener('pointerup', handleSliderPointerUp);
        slider.addEventListener('pointercancel', handleSliderPointerCancel);
        slider.addEventListener('touchstart', stopSliderTouchPropagation);
        slider.addEventListener('touchmove', stopSliderTouchPropagation);
        slider.addEventListener('touchend', stopSliderTouchPropagation);
        slider.addEventListener('touchcancel', stopSliderTouchPropagation);

        return {
            destroy: () => {
                slider.removeEventListener('pointerdown', handleSliderPointerDown);
                slider.removeEventListener('pointermove', handleSliderPointerMove);
                slider.removeEventListener('pointerup', handleSliderPointerUp);
                slider.removeEventListener('pointercancel', handleSliderPointerCancel);
                slider.removeEventListener('touchstart', stopSliderTouchPropagation);
                slider.removeEventListener('touchmove', stopSliderTouchPropagation);
                slider.removeEventListener('touchend', stopSliderTouchPropagation);
                slider.removeEventListener('touchcancel', stopSliderTouchPropagation);
            },
        };
    }

    function handleSliderPointerDown(event: PointerEvent): void {
        event.stopPropagation();
        const slider = event.currentTarget as HTMLInputElement;
        try {
            slider.setPointerCapture(event.pointerId);
        } catch {
            // The pointer may already have ended before a delayed WebView event.
        }
    }

    function handleSliderPointerMove(event: PointerEvent): void {
        event.stopPropagation();
    }

    function handleSliderPointerUp(event: PointerEvent): void {
        event.stopPropagation();
        const slider = event.currentTarget as HTMLInputElement;
        releaseSliderPointer(slider, event.pointerId);

        // Android WebView can retain the range input's implicit pointer capture
        // when the input is removed during its pointerup handler, blocking later
        // scroll gestures. Let pointer teardown finish before closing the selector.
        pendingPointerStart = window.setTimeout(() => {
            pendingPointerStart = undefined;
            startSelected();
        }, 0);
    }

    function handleSliderPointerCancel(event: PointerEvent): void {
        event.stopPropagation();
        releaseSliderPointer(event.currentTarget as HTMLInputElement, event.pointerId);
    }

    function stopSliderTouchPropagation(event: TouchEvent): void {
        // Some Obsidian mobile navigation paths still observe legacy touch events.
        // Pointer events own the slider behavior; these listeners only isolate it.
        event.stopPropagation();
    }

    function releaseSliderPointer(slider: HTMLInputElement, pointerId: number): void {
        if (slider.hasPointerCapture?.(pointerId)) slider.releasePointerCapture(pointerId);
    }

    function closeFromButton(event: MouseEvent): void {
        event.stopPropagation();
        closeSelector(true);
    }

    function resetTimer(event: MouseEvent): void {
        event.stopPropagation();
        closeSelector(false);
        controller.reset(timerKey);
        void tick().then(() => focusWithoutScrolling(buttonElement));
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
            <span class="cook-amt amount">{displayTime}</span>
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
                <span class="cook-timer-range-value">{formatTime(selectedSeconds)}</span>
                <button
                    type="button"
                    class="cook-timer-range-close"
                    aria-label="Close timer range selector"
                    onclick={closeFromButton}
                >×</button>
            </span>
            <input
                bind:this={sliderElement}
                use:ownPointerStream
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
                onkeydown={handleSliderKeydown}
            />
            <span class="cook-timer-range-bounds" aria-hidden="true">
                <span>{formatTime(duration.minimumSeconds)}</span>
                <span>{formatTime(duration.maximumSeconds)}</span>
            </span>
            <span id={sliderHelpId} class="cook-timer-range-help">
                Release to start · Keyboard: Enter
            </span>
        </span>
    {/if}
</span>
