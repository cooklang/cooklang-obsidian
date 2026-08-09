<script lang="ts">
    import { getFlatTimers } from '../../recipeHelpers';
    import type { RecipeRenderModel } from '../types';

    let { model }: { model: RecipeRenderModel } = $props();
    let timers = $derived(getFlatTimers(model.recipe));
</script>

{#if model.settings.showTimersList && timers.length}
    <section class="cook-timer-list">
        <h2 class="cook-section-title">{model.settings.timersLabel || 'Timers'}</h2>
        <ul class="timers">
            {#each timers as timer}
                <li>
                    {#if timer.displayText}<span class="amount">{timer.displayText}</span>{' '}{/if}
                    {timer.name ?? ''}
                </li>
            {/each}
        </ul>
    </section>
{/if}
