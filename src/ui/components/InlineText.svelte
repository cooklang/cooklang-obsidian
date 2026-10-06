<script lang="ts">
    import { splitInlineLinks } from "../../utils/inlineLinks";
    import type { RecipeRenderModel } from "../types";

    let { model, value }: { model: RecipeRenderModel; value: string } = $props();
    let segments = $derived(splitInlineLinks(value));

    function openWiki(event: MouseEvent, linktext: string): void {
        event.preventDefault();
        event.stopPropagation();
        model.host.openWikiLink(model.file?.path ?? "", linktext);
    }
</script>

{#each segments as segment}
    {#if segment.type === "text"}
        {segment.value}
    {:else if segment.type === "wiki"}
        <a class="internal-link" href={segment.linktext} onclick={(event) => openWiki(event, segment.linktext)}>{segment.label}</a>
    {:else}
        <a href={segment.href} target="_blank" rel="noopener noreferrer">{segment.label}</a>
    {/if}
{/each}
