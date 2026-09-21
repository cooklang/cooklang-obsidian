<script lang="ts">
    import RecipePreview from './RecipePreview.svelte';
    import type { CookViewRootProps } from './types';

    let { preview }: CookViewRootProps = $props();
</script>

<div
    class="cook-preview-view"
    class:cook-rich={$preview !== null}
>
    {#if $preview}
        <RecipePreview model={$preview} />
    {/if}
</div>
