<script lang="ts">
    import type { TFile } from 'obsidian';
    import {
        createUnitMap,
        DEFAULT_HOURS_LABELS,
        DEFAULT_MINUTES_LABELS,
        DEFAULT_SECONDS_LABELS,
    } from '../../utils/timeFormatters';
    import { getSections, type StepView } from '../../utils/sectionHelpers';
    import { getStepImageFor } from '../../utils/stepImages';
    import type { RecipeRenderModel } from '../types';
    import StepPart from './StepPart.svelte';

    let { model, allImages }: { model: RecipeRenderModel; allImages: TFile[] } = $props();
    let sections = $derived(getSections(model.recipe));
    let unitMap = $derived(createUnitMap(
        model.settings.minutesLabel || DEFAULT_MINUTES_LABELS,
        model.settings.hoursLabel || DEFAULT_HOURS_LABELS,
        model.settings.secondsLabel || DEFAULT_SECONDS_LABELS,
    ));

    function stepImage(step: StepView): TFile | null {
        if (!model.settings.showImages || !model.file) return null;
        return getStepImageFor(step.globalIndex + 1, model.file.basename, allImages);
    }
</script>

<section class="cook-steps" id="cook-steps">
    <h2 class="cook-section-title">{model.settings.methodLabel || 'Method'}</h2>
    {#each sections as section}
        {#if section.name && sections.length > 1}
            <h3 class="cook-section-band">{section.name}</h3>
        {/if}
        {#each section.entries as entry}
            {#if entry.type === 'note'}
                <aside class="cook-note">
                    <span class="cook-note-icon" aria-hidden="true">💡</span>
                    <span class="cook-note-text">{entry.note}</span>
                </aside>
            {:else}
                {@const step = entry.step}
                {@const tracking = model.settings.enableStepTracking}
                {@const current = tracking && model.state.currentStep === step.globalIndex}
                {@const done = tracking && model.state.currentStep > step.globalIndex}
                {@const image = stepImage(step)}
                <article class:cur={current} class:done={done} class="cook-step">
                    {#if tracking}
                        <button
                            type="button"
                            class="cook-step-toggle cook-step-n"
                            aria-label={`${current ? 'Clear' : 'Mark'} step ${step.globalIndex + 1} as current`}
                            aria-pressed={current}
                            onclick={() => model.callbacks.onStepActivate(step.globalIndex)}
                        >{step.globalIndex + 1}.</button>
                    {:else}
                        <span class="cook-step-n">{step.globalIndex + 1}.</span>
                    {/if}
                    <div class="cook-step-bodywrap">
                        <div class="cook-step-text">
                            {#each step.parts as part, partIndex}
                                <StepPart
                                    {model}
                                    {part}
                                    {unitMap}
                                    timerKey={`${model.instanceId}:step-${step.globalIndex}:part-${partIndex}`}
                                />
                            {/each}
                        </div>
                        {#if image}
                            <figure class="cook-step-image">
                                <img
                                    src={model.host.getResourcePath(image)}
                                    alt={`Step ${step.globalIndex + 1}`}
                                />
                            </figure>
                        {/if}
                    </div>
                </article>
            {/if}
        {/each}
    {/each}
</section>
