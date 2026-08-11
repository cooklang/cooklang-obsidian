<script lang="ts">
    import { buildIngredientDisplayGroups } from '../../utils/ingredientRows';
    import type { RecipeRenderModel } from '../types';
    import ReferenceLink from './ReferenceLink.svelte';

    let { model }: { model: RecipeRenderModel } = $props();
    let groups = $derived(buildIngredientDisplayGroups(model.recipe, model.settings));
</script>

{#if groups.length}
    <section class="cook-ingredients" id="cook-ingredients">
        <h2 class="cook-section-title">{model.settings.ingredientLabel || 'Ingredients'}</h2>
        {#each groups as group, groupIndex}
            {#if group.name}
                <h3 class="cook-ing-group-title">{group.name}</h3>
            {/if}
            <ul class="cook-ing-list">
                {#each group.rows as row, rowIndex}
                    {@const inputId = `${model.instanceId}-ingredient-${groupIndex}-${rowIndex}`}
                    {@const checked = model.state.checkedIngredients.has(row.name)}
                    <li class:done={checked} class="cook-ing">
                        {#if model.interactive}
                            <label class="cook-ing-checkbox-hit">
                                <input
                                    id={inputId}
                                    class="cook-ing-checkbox"
                                    type="checkbox"
                                    {checked}
                                    aria-label={`${checked ? 'Uncheck' : 'Check'} ${row.name}`}
                                    onchange={() => model.callbacks.onIngredientToggle(row.name)}
                                />
                            </label>
                        {:else}
                            <span class="cook-ing-checkbox" aria-hidden="true"></span>
                        {/if}
                        <span class="cook-ing-name">
                            {#if row.reference}
                                <ReferenceLink {model} reference={row.reference} />
                            {:else if model.interactive}
                                <label for={inputId}>{row.name}</label>
                            {:else}
                                {row.name}
                            {/if}
                        </span>
                        {#if row.displayQty}
                            <span class="cook-ing-qty">{row.displayQty}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/each}
    </section>
{/if}
