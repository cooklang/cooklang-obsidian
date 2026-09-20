<script lang="ts">
    import type { Readable } from 'svelte/store';
    import IngredientList from './components/IngredientList.svelte';
    import MethodSteps from './components/MethodSteps.svelte';
    import type { EmbedRenderState } from './types';
    import { recipeName } from '../utils/recipeFiles';

    let { renderState, wholeNote = false }: { renderState: Readable<EmbedRenderState>; wholeNote?: boolean } = $props();
</script>

{#if $renderState.status === 'loading'}
    <div class="cook-embed-loading" role="status">Loading recipe…</div>
{:else if $renderState.status === 'empty'}
    <div class="cook-embed-empty">{wholeNote ? 'Empty recipe.' : 'Empty recipe block.'}</div>
{:else if $renderState.status === 'error'}
    <div class="cook-embed-error" role="alert">
        <div class="cook-embed-error-msg">{$renderState.message}</div>
        <pre><code>{$renderState.source}</code></pre>
    </div>
{:else}
    <div class="cook-embed">
        {#if wholeNote && $renderState.model.file}
            {@const model = $renderState.model}
            {@const file = model.file!}
            <h2 class="cook-embed-title"><a href={file.path} onclick={event => {
                event.preventDefault();
                event.stopPropagation();
                model.host.openReference({ targetPath: file.path, sourcePath: file.path, scaleRequest: null });
            }}>{model.recipe.title?.trim() || recipeName(file.path)}</a></h2>
        {/if}
        <IngredientList model={$renderState.model} />
        <MethodSteps model={$renderState.model} allImages={[]} />
    </div>
{/if}
