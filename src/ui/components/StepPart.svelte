<script lang="ts">
    import {
        cookware_display_name,
        ingredient_display_name,
        quantity_display,
    } from '../../recipeHelpers';
    import { formatTimerDuration, timerDurationFromQuantity } from '../../utils/timeFormatters';
    import { numericFromQuantity } from '../../utils/quantityValue';
    import type { StepPart } from '../../utils/sectionHelpers';
    import type { RecipeRenderModel } from '../types';
    import ReferenceLink from './ReferenceLink.svelte';
    import TimerButton from './TimerButton.svelte';

    let {
        model,
        part,
        unitMap,
        timerKey,
    }: {
        model: RecipeRenderModel;
        part: StepPart;
        unitMap: Record<string, number>;
        timerKey: string;
    } = $props();
    let duration = $derived(part.type === 'timer'
        ? timerDurationFromQuantity(part.timer.quantity, unitMap)
        : null);
</script>

{#if part.type === 'text'}
    {part.value}
{:else if part.type === 'ingredient'}
    <span class:cook-ig-hl={model.settings.highlightIngredientCookware && !part.ingredient.reference} class="cook-ig">
        {#if part.ingredient.reference}
            <ReferenceLink
                {model}
                reference={{
                    name: part.ingredient.reference.name,
                    components: part.ingredient.reference.components ?? [],
                    quantity: part.ingredient.quantity
                        ? numericFromQuantity(part.ingredient.quantity)
                        : null,
                    unit: part.ingredient.quantity?.unit ?? null,
                }}
            />
        {:else}
            {ingredient_display_name(part.ingredient)}
        {/if}{#if part.ingredient.note?.trim()}<span class="cook-ig-prep">, {part.ingredient.note.trim()}</span>{/if}{#if model.settings.showQuantitiesInline && part.ingredient.quantity}
            {' '}<span class="cook-amt">({quantity_display(part.ingredient.quantity)})</span>
        {/if}
    </span>
{:else if part.type === 'cookware'}
    <span class:cook-cw-hl={model.settings.highlightIngredientCookware} class="cook-cw">
        {cookware_display_name(part.cookware)}
    </span>
{:else if part.type === 'inlineQuantity'}
    <span class="cook-amt">{quantity_display(part.quantity)}</span>
{:else if model.settings.showTimersInline && duration && model.timers}
    <TimerButton
        controller={model.timers}
        {timerKey}
        {duration}
        label={part.timer.name ?? ''}
    />
{:else}
    <span class="cook-timer">
        <span aria-hidden="true">⏱</span>
        {#if duration}{' '}<span class="cook-amt">{formatTimerDuration(duration)}</span>{/if}
        {#if part.timer.name}<span class="cook-timer-name">{part.timer.name}</span>{/if}
    </span>
{/if}
