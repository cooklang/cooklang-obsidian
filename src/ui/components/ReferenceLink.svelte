<script lang="ts">
    import type { RecipeRefTarget } from '../../utils/ingredientAggregator';
    import type { RecipeRenderModel } from '../types';

    let { model, reference }: { model: RecipeRenderModel; reference: RecipeRefTarget } = $props();
    let resolved = $derived(model.host.resolveReference(model.file, reference));

    function open(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (resolved) model.host.openReference(resolved);
    }
</script>

{#if resolved}
    <a class="cook-ref-link" href={resolved.targetPath} onclick={open}>{reference.name}</a>
{:else}
    <span class="cook-ref-missing">{reference.name}</span>
{/if}
