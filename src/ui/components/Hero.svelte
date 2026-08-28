<script lang="ts">
    import type { TFile } from 'obsidian';
    import { buildMetaPills } from '../../utils/heroModel';
    import type { RecipeRenderModel } from '../types';

    let { model, mainImage }: { model: RecipeRenderModel; mainImage: TFile | string | null } = $props();
    let title = $derived(model.recipe.title?.trim() || model.file?.basename || 'Recipe');
    let description = $derived(model.recipe.description?.trim());
    let pills = $derived(buildMetaPills(model.recipe, model.state.displayServings));
    let mainImageUrl = $derived(
        typeof mainImage === 'string' ? mainImage : mainImage ? model.host.getResourcePath(mainImage) : null
    );
</script>

<header class="cook-hero">
    <div class="cook-hero-body">
        <h1 class="cook-hero-title">{title}</h1>
        {#if description}
            <p class="cook-hero-desc">{description}</p>
        {/if}
        {#if pills.length}
            <div class="cook-pills" aria-label="Recipe information">
                {#each pills as pill}
                    {#if pill.url && (pill.kind === 'source' || pill.kind === 'author')}
                        <a
                            class="cook-pill"
                            href={pill.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {#if pill.icon}<span class="cook-pill-icon" aria-hidden="true">{pill.icon}</span>{/if}
                            {pill.text}
                        </a>
                    {:else}
                        <span class:cook-pill-tag={pill.kind === 'tag'} class="cook-pill">
                            {#if pill.icon}<span class="cook-pill-icon" aria-hidden="true">{pill.icon}</span>{/if}
                            {pill.text}
                        </span>
                    {/if}
                {/each}
            </div>
        {/if}
    </div>

    {#if model.settings.showImages && mainImageUrl}
        <figure class="cook-hero-image">
            <img src={mainImageUrl} alt={`${title} recipe`} />
        </figure>
    {/if}
</header>
