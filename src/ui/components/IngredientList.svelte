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
                    {@const singlePreparation = row.preparations.length === 1 ? row.preparations[0] : null}
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
                        <div class="cook-ing-content">
                            {#if row.preparations.length > 1}
                                <details class="cook-ing-details">
                                    <summary class="cook-ing-main">
                                        <span class="cook-ing-name">
                                            {#if row.reference}
                                                <ReferenceLink {model} reference={row.reference} />
                                            {:else}
                                                {row.name}
                                            {/if}
                                        </span>
                                        {#if row.displayQty}
                                            <span class="cook-ing-qty">{row.displayQty}</span>
                                        {/if}
                                        <span class="cook-ing-disclosure-icon" aria-hidden="true"></span>
                                    </summary>
                                    <ul class="cook-ing-prep-list">
                                        {#each row.preparations as preparation}
                                            <li class="cook-ing-prep">
                                                <span class="cook-ing-prep-name">{preparation.name}</span>
                                                {#if preparation.displayQty}
                                                    <span class="cook-ing-prep-qty">{preparation.displayQty}</span>
                                                {/if}
                                            </li>
                                        {/each}
                                    </ul>
                                </details>
                            {:else}
                                <div class="cook-ing-main">
                                    <span class="cook-ing-name">
                                        {#if row.reference}
                                            <ReferenceLink {model} reference={row.reference} />
                                        {:else}
                                            {row.name}
                                        {/if}
                                        {#if singlePreparation}
                                            <span class="cook-ing-single-prep">
                                                — {singlePreparation.name}{#if singlePreparation.displayQty}
                                                    {' '}<span class="cook-ing-prep-qty">{singlePreparation.displayQty}</span>
                                                {/if}
                                            </span>
                                        {/if}
                                    </span>
                                    {#if row.displayQty}
                                        <span class="cook-ing-qty">{row.displayQty}</span>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>
        {/each}
    </section>
{/if}
