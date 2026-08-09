<script lang="ts">
    import { findRecipeImages } from '../utils/imageHelpers';
    import CookwareList from './components/CookwareList.svelte';
    import Hero from './components/Hero.svelte';
    import IngredientList from './components/IngredientList.svelte';
    import Metadata from './components/Metadata.svelte';
    import MethodSteps from './components/MethodSteps.svelte';
    import ScalerBar from './components/ScalerBar.svelte';
    import TimerList from './components/TimerList.svelte';
    import type { RecipeRenderModel } from './types';

    let { model }: { model: RecipeRenderModel } = $props();
    let images = $derived(findRecipeImages(model.file));
</script>

<Hero {model} mainImage={images.mainImage} />
<ScalerBar {model} />

<div class:cook-cols-stacked={!model.settings.twoColumnLayout} class="cook-cols">
    <aside class="cook-aside" aria-label="Recipe ingredients and equipment">
        <IngredientList {model} />
        <CookwareList {model} />
        <TimerList {model} />
    </aside>
    <main class="cook-main">
        <MethodSteps {model} allImages={images.allImages} />
    </main>
</div>

<Metadata {model} />
