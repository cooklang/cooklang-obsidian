<script lang="ts">
    import { getFlatCookware } from '../../recipeHelpers';
    import type { RecipeRenderModel } from '../types';

    let { model }: { model: RecipeRenderModel } = $props();
    let cookware = $derived(getFlatCookware(model.recipe));
</script>

{#if model.settings.showCookwareList && cookware.length}
    <section class="cook-cookware">
        <h2 class="cook-section-title">{model.settings.cookwareLabel || 'Cookware'}</h2>
        <ul class="cook-cookware-list">
            {#each cookware as item}
                <li class="cook-cookware-item">
                    {#if item.displayText}<span class="amount cook-cookware-amount">{item.displayText}</span>{' '}{/if}
                    <span class="cook-cookware-name">{item.name}</span>
                </li>
            {/each}
        </ul>
    </section>
{/if}
