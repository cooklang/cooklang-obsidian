import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import type { TFile } from 'obsidian';

export interface PreviewState {
    scale: number;                       // 1 = base
    baseServings: number | null;         // null when recipe has no numeric servings
    displayServings: number | null;      // baseServings * scale, rounded; null when no servings
    checkedIngredients: Set<string>;     // keyed by ingredient name only
    currentStep: number;                 // 0-based global step index, -1 = none active
}

export interface PreviewCallbacks {
    onScaleChange: (targetServings: number) => void;
    onIngredientToggle: () => void;
    onStepActivate: (globalStepIndex: number) => void;
}

export interface RenderContext {
    recipe: CooklangRecipe;
    file: TFile | null;
    state: PreviewState;
    callbacks: PreviewCallbacks;
}
