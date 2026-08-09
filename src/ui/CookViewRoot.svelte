<script lang="ts">
    import RecipePreview from './RecipePreview.svelte';
    import type { CookViewRootProps } from './types';

    let { mode, preview, onSourceReady }: CookViewRootProps = $props();

    function sourceHost(node: HTMLElement): void {
        onSourceReady(node);
    }
</script>

<div
    class="cook-source-view-full"
    class:cook-view-hidden={$mode !== 'source'}
    use:sourceHost
></div>
<div
    class="cook-preview-view"
    class:cook-rich={$preview !== null}
    class:cook-view-hidden={$mode !== 'preview'}
>
    {#if $preview}
        <RecipePreview model={$preview} />
    {/if}
</div>
