<script lang="ts">
    import { getAdditionalMetadata } from '../../utils/metadataEntries';
    import { isValidUrl } from '../../utils/urlValidators';
    import type { RecipeRenderModel } from '../types';

    let { model }: { model: RecipeRenderModel } = $props();
    let entries = $derived(getAdditionalMetadata(model.recipe));
</script>

{#if entries.length}
    <details class="cook-more">
        <summary class="cook-more-summary">{model.settings.metadataLabel || 'More details'}</summary>
        <ul class="cook-more-list">
            {#each entries as entry}
                <li>
                    <span class="cook-more-key">{entry.key}</span>
                    {#if isValidUrl(entry.value)}
                        <a href={entry.value} target="_blank" rel="noopener noreferrer">{entry.value}</a>
                    {:else}
                        {entry.value}
                    {/if}
                </li>
            {/each}
        </ul>
    </details>
{/if}
