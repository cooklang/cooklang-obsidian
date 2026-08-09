<script lang="ts">
    import type { Readable } from 'svelte/store';
    import IngredientList from './components/IngredientList.svelte';
    import MethodSteps from './components/MethodSteps.svelte';
    import type { EmbedRenderState } from './types';

    let { renderState }: { renderState: Readable<EmbedRenderState> } = $props();
</script>

{#if $renderState.status === 'loading'}
    <div class="cook-embed-loading" role="status">Loading recipe…</div>
{:else if $renderState.status === 'empty'}
    <div class="cook-embed-empty">Empty recipe block.</div>
{:else if $renderState.status === 'error'}
    <div class="cook-embed-error" role="alert">
        <div class="cook-embed-error-msg">{$renderState.message}</div>
        <pre><code>{$renderState.source}</code></pre>
    </div>
{:else}
    <div class="cook-embed">
        <IngredientList model={$renderState.model} />
        <MethodSteps model={$renderState.model} allImages={[]} />
    </div>
{/if}
