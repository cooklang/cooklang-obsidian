<script lang="ts">
    import { getAdditionalMetadata } from '../../utils/metadataEntries';
    import { getSafeExternalUrl } from '../../utils/urlValidators';
    import type { RecipeRenderModel } from '../types';

    let { model }: { model: RecipeRenderModel } = $props();
    let entries = $derived(getAdditionalMetadata(model.recipe));
</script>

{#if entries.length}
    <details class="cook-more">
        <summary class="cook-more-summary">{model.settings.metadataLabel || 'More details'}</summary>
        <ul class="cook-more-list">
            {#each entries as entry}
                {@const url = getSafeExternalUrl(entry.value)}
                <li>
                    <span class="cook-more-key">{entry.key}</span>
                    {#if url}
                        <a href={url} target="_blank" rel="noopener noreferrer">{entry.value}</a>
                    {:else}
                        {entry.value}
                    {/if}
                </li>
            {/each}
        </ul>
    </details>
{/if}
