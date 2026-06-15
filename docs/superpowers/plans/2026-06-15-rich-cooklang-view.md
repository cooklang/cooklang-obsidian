# Rich Cooklang Preview Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Cooklang `.cook` preview into a single rich page — hero with meta pills + title image, a sticky servings scaler, a two-column ingredients/steps layout with Cooklang sections, notes, per-step images, and current-step tracking — all using native Obsidian theming.

**Architecture:** Preview overhaul only. New pure helper modules (`utils/`) hold all testable logic; new/updated renderers (`renderers/`) consume them and emit DOM via Obsidian's `createEl`. `CookView` gains `scale` + `currentStep` state (persisted in view state) and re-parses through the existing `parserService.parse(data, scale)` for live rescaling. `PreviewRenderer` becomes a layout orchestrator.

**Tech Stack:** TypeScript, Obsidian API (`TextFileView`, `createEl`), `@cooklang/cooklang-ts` (WASM parser), SCSS bundled by Rollup, Vitest (new, for pure-logic unit tests).

**Spec:** `docs/superpowers/specs/2026-06-15-rich-cooklang-view-design.md`

**Verification model:**
- Pure logic (Tasks 2–5): full TDD with Vitest (node env, plain-object mocks — no WASM/Obsidian import).
- Renderers/DOM/CSS (Tasks 6–14): `npm run build` must succeed (tsc `noEmitOnError`), then manual verification in Obsidian with the sample recipes from Task 1. Obsidian's `createEl` extensions aren't present under jsdom, so DOM renderers are verified by build + manual, not unit tests.

**Shared render contract** (defined in Task 8, used by Tasks 9–13 — do not drift from these names):

```ts
// src/renderers/types.ts
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
```

---

## Task 1: Sample recipes + Vitest harness

**Files:**
- Create: `test-recipes/curry.cook`
- Create: `test-recipes/curry.0.png` (any small image; placeholder for step-1 image)
- Create: `test-recipes/curry.jpg` (any small image; title image)
- Create: `vitest.config.ts`
- Create: `src/utils/__tests__/smoke.test.ts`
- Modify: `package.json` (add `test` script + devDeps)

- [ ] **Step 1: Add Vitest devDependency and test script**

Run:
```bash
npm install -D vitest@^2.0.0
```

Then edit `package.json` `scripts` to add:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
```

- [ ] **Step 3: Create a smoke test**

`src/utils/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
    it('runs', () => {
        expect(1 + 1).toBe(2);
    });
});
```

- [ ] **Step 4: Run the smoke test**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 5: Create sample recipe for manual testing**

`test-recipes/curry.cook`:
```cook
---
title: Thai Green Curry
description: A fragrant weeknight curry with homemade paste.
servings: 4
time: 45
course: dinner
source: https://www.seriouseats.com
tags: dinner, thai
difficulty: medium
---

= Curry paste

Blitz the @green curry paste{3%tbsp} in a #blender until smooth.

> Make double and freeze half in an ice-cube tray.

= Cooking

Fry the paste in a #wok for ~{2%min} until fragrant, then pour in the @coconut milk{400%ml}.

Add the @chicken thigh{500%g} and @aubergine{1}; simmer for ~{15%min}.

Season with @fish sauce{2%tbsp}, scatter @thai basil{1%handful} and serve.
```

Create `test-recipes/curry.jpg` and `test-recipes/curry.0.png` as any small placeholder images (e.g. copy `logo.svg` is not an image extension — use a real png/jpg). Example:
```bash
# Use an existing image in the repo or create 1x1 placeholders
cp screenshot.png test-recipes/curry.jpg
cp screenshot.png test-recipes/curry.0.png
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/utils/__tests__/smoke.test.ts test-recipes
git commit -m "test: add vitest harness and sample recipe"
```

---

## Task 2: `getSections()` helper

Reads `recipe.sections` into a view model: per-section name, ordered steps (with a global 0-based index for image lookup + step tracking), text notes, and the ingredient indices referenced in that section.

**Files:**
- Create: `src/utils/sectionHelpers.ts`
- Create: `src/utils/sectionHelpers.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/sectionHelpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getSections } from './sectionHelpers';

// Minimal recipe shaped like CooklangRecipe (only fields getSections reads)
function makeRecipe() {
    return {
        ingredients: [{ name: 'paste' }, { name: 'coconut milk' }],
        cookware: [{ name: 'blender' }],
        timers: [{ name: null }],
        sections: [
            {
                name: 'Curry paste',
                content: [
                    { type: 'step', value: { number: 1, items: [
                        { type: 'text', value: 'Blitz the ' },
                        { type: 'ingredient', index: 0 },
                        { type: 'text', value: ' in a ' },
                        { type: 'cookware', index: 0 },
                        { type: 'text', value: '.' },
                    ] } },
                    { type: 'text', value: 'Make double and freeze.' },
                ],
            },
            {
                name: 'Cooking',
                content: [
                    { type: 'step', value: { number: 1, items: [
                        { type: 'text', value: 'Fry for ' },
                        { type: 'timer', index: 0 },
                        { type: 'text', value: ' then add ' },
                        { type: 'ingredient', index: 1 },
                    ] } },
                ],
            },
        ],
    } as any;
}

describe('getSections', () => {
    it('returns one entry per section with names', () => {
        const s = getSections(makeRecipe());
        expect(s.map(x => x.name)).toEqual(['Curry paste', 'Cooking']);
    });

    it('assigns a global 0-based step index across sections', () => {
        const s = getSections(makeRecipe());
        expect(s[0].steps[0].globalIndex).toBe(0);
        expect(s[1].steps[0].globalIndex).toBe(1);
    });

    it('resolves step parts to ingredient/cookware/timer objects', () => {
        const s = getSections(makeRecipe());
        const parts = s[0].steps[0].parts;
        expect(parts[0]).toEqual({ type: 'text', value: 'Blitz the ' });
        expect(parts[1]).toEqual({ type: 'ingredient', ingredient: { name: 'paste' } });
        expect(parts[3]).toEqual({ type: 'cookware', cookware: { name: 'blender' } });
        expect(s[1].steps[0].parts[1]).toEqual({ type: 'timer', timer: { name: null } });
    });

    it('collects text blocks as notes', () => {
        const s = getSections(makeRecipe());
        expect(s[0].notes).toEqual(['Make double and freeze.']);
        expect(s[1].notes).toEqual([]);
    });

    it('collects unique ingredient indices per section in first-seen order', () => {
        const s = getSections(makeRecipe());
        expect(s[0].ingredientIndices).toEqual([0]);
        expect(s[1].ingredientIndices).toEqual([1]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- sectionHelpers`
Expected: FAIL — `getSections` is not defined / module not found.

- [ ] **Step 3: Write the implementation**

`src/utils/sectionHelpers.ts`:
```ts
/**
 * Section view-model helpers.
 *
 * Reads recipe.sections into a structure the renderers can consume directly,
 * preserving section names, ordering text blocks as notes, and assigning each
 * step a global 0-based index (used for per-step images and current-step
 * tracking). Pure — imports types only, no WASM/Obsidian runtime.
 */
import type {
    CooklangRecipe,
    Ingredient,
    Cookware,
    Timer,
} from '@cooklang/cooklang-ts';

export type StepPart =
    | { type: 'text'; value: string }
    | { type: 'ingredient'; ingredient: Ingredient }
    | { type: 'cookware'; cookware: Cookware }
    | { type: 'timer'; timer: Timer };

export interface StepView {
    /** Step number within its section (1-based, from parser). */
    number: number;
    /** Global 0-based index across all steps in the recipe. */
    globalIndex: number;
    parts: StepPart[];
}

export interface SectionView {
    name: string | null;
    steps: StepView[];
    notes: string[];
    /** Unique ingredient indices referenced in this section, first-seen order. */
    ingredientIndices: number[];
}

export function getSections(recipe: CooklangRecipe): SectionView[] {
    const result: SectionView[] = [];
    let globalIndex = 0;

    for (const section of recipe.sections) {
        const view: SectionView = {
            name: section.name ?? null,
            steps: [],
            notes: [],
            ingredientIndices: [],
        };
        const seen = new Set<number>();

        for (const content of section.content) {
            if (content.type === 'text') {
                view.notes.push(content.value);
                continue;
            }
            // content.type === 'step'
            const step = content.value;
            const parts: StepPart[] = [];
            for (const item of step.items) {
                if (item.type === 'text') {
                    parts.push({ type: 'text', value: item.value });
                } else if (item.type === 'ingredient') {
                    const ingredient = recipe.ingredients[item.index];
                    parts.push({ type: 'ingredient', ingredient });
                    if (!seen.has(item.index)) {
                        seen.add(item.index);
                        view.ingredientIndices.push(item.index);
                    }
                } else if (item.type === 'cookware') {
                    parts.push({ type: 'cookware', cookware: recipe.cookware[item.index] });
                } else if (item.type === 'timer') {
                    parts.push({ type: 'timer', timer: recipe.timers[item.index] });
                }
                // 'inlineQuantity' items are ignored in the preview
            }
            view.steps.push({ number: step.number, globalIndex: globalIndex++, parts });
        }
        result.push(view);
    }
    return result;
}

/** True when the recipe has more than one named section worth showing as bands. */
export function hasNamedSections(sections: SectionView[]): boolean {
    return sections.filter(s => s.name && s.name.trim().length > 0).length > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- sectionHelpers`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/sectionHelpers.ts src/utils/sectionHelpers.test.ts
git commit -m "feat: add getSections view-model helper"
```

---

## Task 3: Step image matching helper

**Files:**
- Create: `src/utils/stepImages.ts`
- Create: `src/utils/stepImages.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/stepImages.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractStepIndex, getStepImageFor } from './stepImages';

describe('extractStepIndex', () => {
    it('parses the numeric suffix', () => {
        expect(extractStepIndex('Curry.0', 'Curry')).toBe(0);
        expect(extractStepIndex('Curry.12', 'Curry')).toBe(12);
    });
    it('returns null for the main image (no suffix)', () => {
        expect(extractStepIndex('Curry', 'Curry')).toBeNull();
    });
    it('returns null for non-numeric suffixes', () => {
        expect(extractStepIndex('Curry.banner', 'Curry')).toBeNull();
        expect(extractStepIndex('Curry.0.thumb', 'Curry')).toBeNull();
    });
    it('returns null when basename does not match recipe', () => {
        expect(extractStepIndex('Other.0', 'Curry')).toBeNull();
    });
});

describe('getStepImageFor', () => {
    const images = [
        { basename: 'Curry', extension: 'jpg' },
        { basename: 'Curry.0', extension: 'png' },
        { basename: 'Curry.2', extension: 'jpg' },
    ];
    it('finds the image for a step index', () => {
        expect(getStepImageFor(0, 'Curry', images)).toBe(images[1]);
        expect(getStepImageFor(2, 'Curry', images)).toBe(images[2]);
    });
    it('returns null when no image matches the step', () => {
        expect(getStepImageFor(1, 'Curry', images)).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- stepImages`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Write the implementation**

`src/utils/stepImages.ts`:
```ts
/**
 * Pure helpers for matching Cooklang per-step images.
 *
 * Convention (https://cooklang.org/docs/spec/#adding-pictures): a step image is
 * a sibling file named "<recipeBasename>.<stepIndex>.<ext>" where stepIndex is
 * the 0-based position of the step across the whole recipe. The main/title
 * image is "<recipeBasename>.<ext>" with no numeric suffix.
 *
 * Generic over a minimal { basename, extension } shape so this stays free of
 * the Obsidian runtime and unit-testable.
 */
export interface ImageLike {
    basename: string;
    extension: string;
}

/**
 * Returns the 0-based step index encoded in an image basename, or null if the
 * basename is not a "<recipeBasename>.<digits>" step image.
 */
export function extractStepIndex(imageBasename: string, recipeBasename: string): number | null {
    const prefix = recipeBasename + '.';
    if (!imageBasename.startsWith(prefix)) return null;
    const suffix = imageBasename.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return null;
    return parseInt(suffix, 10);
}

export function getStepImageFor<T extends ImageLike>(
    stepIndex: number,
    recipeBasename: string,
    images: T[],
): T | null {
    for (const image of images) {
        if (extractStepIndex(image.basename, recipeBasename) === stepIndex) {
            return image;
        }
    }
    return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- stepImages`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/stepImages.ts src/utils/stepImages.test.ts
git commit -m "feat: add per-step image matching helpers"
```

---

## Task 4: Servings scaling math

**Files:**
- Create: `src/utils/scaling.ts`
- Create: `src/utils/scaling.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/scaling.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseServingsValue, computeScale, clampServings } from './scaling';

describe('parseServingsValue', () => {
    it('accepts positive numbers', () => {
        expect(parseServingsValue(4)).toBe(4);
    });
    it('extracts leading number from strings like "4 servings"', () => {
        expect(parseServingsValue('4 servings')).toBe(4);
        expect(parseServingsValue('serves 6')).toBe(6);
    });
    it('returns null for non-positive or non-numeric', () => {
        expect(parseServingsValue(0)).toBeNull();
        expect(parseServingsValue('a lot')).toBeNull();
        expect(parseServingsValue(undefined)).toBeNull();
    });
});

describe('computeScale', () => {
    it('divides target by base', () => {
        expect(computeScale(8, 4)).toBe(2);
        expect(computeScale(2, 4)).toBe(0.5);
    });
    it('returns 1 when base is non-positive', () => {
        expect(computeScale(8, 0)).toBe(1);
    });
});

describe('clampServings', () => {
    it('rounds and clamps to [1, 1000]', () => {
        expect(clampServings(3.6)).toBe(4);
        expect(clampServings(0)).toBe(1);
        expect(clampServings(99999)).toBe(1000);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scaling`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Write the implementation**

`src/utils/scaling.ts`:
```ts
/**
 * Pure servings-scaling math used by the scaler bar and CookView.
 */

// `@cooklang/cooklang-ts` does not re-export its `Servings` type, so mirror it
// locally (it is `number | string`).
type Servings = number | string;

/** Numeric base servings from recipe metadata, or null if not derivable. */
export function parseServingsValue(servings: Servings | undefined): number | null {
    if (typeof servings === 'number') {
        return servings > 0 ? servings : null;
    }
    if (typeof servings === 'string') {
        const match = servings.match(/\d+(\.\d+)?/);
        if (match) {
            const n = parseFloat(match[0]);
            if (n > 0) return n;
        }
    }
    return null;
}

/** Scale factor to pass to the parser: target / base. */
export function computeScale(targetServings: number, baseServings: number): number {
    if (baseServings <= 0) return 1;
    return targetServings / baseServings;
}

/** Round to an integer servings count within sane bounds. */
export function clampServings(value: number, min = 1, max = 1000): number {
    return Math.max(min, Math.min(max, Math.round(value)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- scaling`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/scaling.ts src/utils/scaling.test.ts
git commit -m "feat: add servings scaling math helpers"
```

---

## Task 5: Hero meta-pill model

Builds the ordered list of pills shown in the hero, from typed recipe fields. Pure; the DOM is built by `HeroRenderer` (Task 9).

**Files:**
- Create: `src/utils/heroModel.ts`
- Create: `src/utils/heroModel.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/heroModel.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildMetaPills, formatDuration } from './heroModel';

describe('formatDuration', () => {
    it('formats minutes', () => {
        expect(formatDuration(45)).toBe('45 min');
    });
    it('formats hours and minutes', () => {
        expect(formatDuration(90)).toBe('1 h 30 min');
        expect(formatDuration(120)).toBe('2 h');
    });
});

describe('buildMetaPills', () => {
    it('builds time, servings, difficulty, source, and tag pills', () => {
        const recipe = {
            time: 45,
            servings: 4,
            difficulty: 'medium',
            source: { url: 'https://seriouseats.com', name: undefined },
            course: 'dinner',
            cuisine: undefined,
            diet: undefined,
            tags: new Set(['thai', 'quick']),
        } as any;
        const pills = buildMetaPills(recipe, 8);
        const kinds = pills.map(p => p.kind);
        expect(kinds).toContain('time');
        expect(kinds).toContain('servings');
        expect(kinds).toContain('difficulty');
        expect(kinds).toContain('source');
        expect(kinds.filter(k => k === 'tag').length).toBe(2);
        // displayServings overrides base servings in the text
        expect(pills.find(p => p.kind === 'servings')!.text).toContain('8');
    });

    it('handles prep/cook time objects', () => {
        const recipe = { time: { prep_time: 10, cook_time: 20 }, tags: new Set() } as any;
        const pills = buildMetaPills(recipe, null);
        expect(pills.find(p => p.kind === 'time')!.text).toBe('30 min');
    });

    it('emits no pills when nothing is present', () => {
        const recipe = { tags: new Set() } as any;
        expect(buildMetaPills(recipe, null)).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- heroModel`
Expected: FAIL — functions not defined.

- [ ] **Step 3: Write the implementation**

`src/utils/heroModel.ts`:
```ts
/**
 * Pure model for hero meta pills, derived from the typed recipe fields.
 */
import type { CooklangRecipe } from '@cooklang/cooklang-ts';

// `@cooklang/cooklang-ts` does not re-export its `RecipeTime` type, so mirror it
// locally (minutes as a number, or a prep/cook breakdown).
type RecipeTime = number | { prep_time?: number; cook_time?: number };

export type PillKind =
    | 'time' | 'servings' | 'difficulty' | 'source'
    | 'course' | 'cuisine' | 'diet' | 'tag';

export interface MetaPill {
    kind: PillKind;
    /** Short emoji/glyph icon, or '' for tags. */
    icon: string;
    text: string;
    /** Present for source pills that link out. */
    url?: string;
}

/** Total minutes from a RecipeTime (number or {prep,cook}). */
function totalMinutes(time: RecipeTime | undefined): number | null {
    if (typeof time === 'number') return time > 0 ? time : null;
    if (time && typeof time === 'object') {
        const sum = (time.prep_time ?? 0) + (time.cook_time ?? 0);
        return sum > 0 ? sum : null;
    }
    return null;
}

export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h <= 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
}

function asText(value: unknown): string | null {
    if (value == null) return null;
    const s = String(value).trim();
    return s.length ? s : null;
}

/**
 * @param displayServings overrides the servings pill text (e.g. scaled count).
 *        Pass null to use the recipe's own servings value.
 */
export function buildMetaPills(
    recipe: CooklangRecipe,
    displayServings: number | null,
): MetaPill[] {
    const pills: MetaPill[] = [];

    const minutes = totalMinutes(recipe.time);
    if (minutes !== null) {
        pills.push({ kind: 'time', icon: '⏱', text: formatDuration(minutes) });
    }

    const servingsText = displayServings != null
        ? String(displayServings)
        : asText(recipe.servings);
    if (servingsText) {
        const n = Number(servingsText);
        const label = Number.isFinite(n)
            ? `${servingsText} serving${n === 1 ? '' : 's'}`
            : servingsText;
        pills.push({ kind: 'servings', icon: '🍽', text: label });
    }

    const difficulty = asText(recipe.difficulty);
    if (difficulty) pills.push({ kind: 'difficulty', icon: '🔥', text: difficulty });

    const course = asText(recipe.course);
    if (course) pills.push({ kind: 'course', icon: '🍴', text: course });

    const cuisine = asText(recipe.cuisine);
    if (cuisine) pills.push({ kind: 'cuisine', icon: '🌍', text: cuisine });

    const diet = asText(recipe.diet);
    if (diet) pills.push({ kind: 'diet', icon: '🌱', text: diet });

    if (recipe.source) {
        const text = recipe.source.name ?? recipe.source.url ?? null;
        if (text) {
            pills.push({ kind: 'source', icon: '↗', text, url: recipe.source.url });
        }
    }

    if (recipe.tags) {
        for (const tag of recipe.tags) {
            const t = asText(tag);
            if (t) pills.push({ kind: 'tag', icon: '', text: `#${t}` });
        }
    }

    return pills;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- heroModel`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/heroModel.ts src/utils/heroModel.test.ts
git commit -m "feat: add hero meta-pill model"
```

---

## Task 6: New settings + settings tab UI

**Files:**
- Modify: `src/settings.ts`

- [ ] **Step 1: Add new fields to `CooklangSettings`**

In `src/settings.ts`, add after `highlightIngredientCookware` (line 20):
```ts
  showServingsScaler: boolean = true;
  twoColumnLayout: boolean = true;
  enableStepTracking: boolean = true;
  servingsLabel: string = "";
```

- [ ] **Step 2: Add toggles to the settings tab**

In `src/settings.ts`, inside `display()`, after the "Highlight Ingredients & Cookware" setting block (ends ~line 88), insert:
```ts
    new Setting(containerEl)
      .setName('Servings scaler')
      .setDesc('Show a +/- control to rescale ingredient quantities by servings')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showServingsScaler)
        .onChange((value: boolean) => {
          this.plugin.settings.showServingsScaler = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Two-column layout')
      .setDesc('Show ingredients beside the steps on wide panes (stacks on narrow panes)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.twoColumnLayout)
        .onChange((value: boolean) => {
          this.plugin.settings.twoColumnLayout = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Step tracking')
      .setDesc('Tap a step to mark it current and dim completed steps')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableStepTracking)
        .onChange((value: boolean) => {
          this.plugin.settings.enableStepTracking = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));
```

- [ ] **Step 3: Add the servings label text input**

After the "Ingredient Label" setting block (ends ~line 193), insert:
```ts
    new Setting(containerEl)
      .setName("Servings Label")
      .setDesc("Choose your label for servings")
      .addText((text) => text
      .setValue(this.plugin.settings.servingsLabel)
      .setPlaceholder("servings")
      .onChange(async (value) => {
        this.plugin.settings.servingsLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));
```

- [ ] **Step 4: Build to verify it compiles**

Run: `npm run build`
Expected: build succeeds, `main.js` regenerated, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/settings.ts
git commit -m "feat: add scaler, layout, and step-tracking settings"
```

---

## Task 7: CookView state — scale, currentStep, name-keyed checks, re-parse

Adds the cooking-session state and rewires `renderPreview` to pass the shared `RenderContext`. The renderers it calls are updated in later tasks; this task wires the plumbing and keeps the build green by having `PreviewRenderer.render` accept the new signature (Task 8 supplies the new body — do Task 8 immediately after).

**Files:**
- Modify: `src/cookView.ts`

- [ ] **Step 1: Add state fields**

In `src/cookView.ts`, replace the `checkedIngredients` field (line 41) with:
```ts
    checkedIngredients: Set<string> = new Set();
    scale: number = 1;
    currentStep: number = -1;
```

- [ ] **Step 2: Add a re-parse + render entry point**

Replace `renderPreview()` (lines 340–352) with:
```ts
    // render the preview view
    renderPreview() {
        if (!parserService.isReady()) return;

        // Re-parse at the current scale so quantities (list + inline) rescale.
        const [rawRecipe] = parserService.parse(this.data, this.scale);
        this.rawRecipe = rawRecipe;

        const baseServings = parseServingsValue(rawRecipe.servings);
        const displayServings = baseServings != null
            ? clampServings(baseServings * this.scale)
            : null;

        this.previewRenderer.updateSettings(this.settings);
        this.previewRenderer.render(this.previewEl, this.file, {
            recipe: rawRecipe,
            file: this.file,
            state: {
                scale: this.scale,
                baseServings,
                displayServings,
                checkedIngredients: this.checkedIngredients,
                currentStep: this.currentStep,
            },
            callbacks: {
                onScaleChange: (targetServings: number) => {
                    if (baseServings == null) return;
                    this.scale = computeScale(targetServings, baseServings);
                    this.renderPreview();
                },
                onIngredientToggle: () => this.renderPreview(),
                onStepActivate: (index: number) => {
                    this.currentStep = this.currentStep === index ? -1 : index;
                    this.renderPreview();
                },
            },
        });
    }
```

- [ ] **Step 3: Add the helper imports**

At the top of `src/cookView.ts`, after the existing `import { PreviewRenderer } ...` line (line 14), add:
```ts
import { parseServingsValue, computeScale, clampServings } from './utils/scaling';
import type { RenderContext } from './renderers/types';
```

- [ ] **Step 4: Update `setViewMode` preview branch**

In `setViewMode` (lines 154–160), replace the preview parse/render block:
```ts
            this.sourceEl.style.display = 'none';
            this.previewEl.style.display = 'block';
            // Parse and render the preview
            this.renderPreview();
```
(Remove the now-duplicated `parserService.parse(this.data)` lines — `renderPreview` parses.)

- [ ] **Step 5: Persist scale + currentStep in view state**

In `getState()` (lines 307–313), return:
```ts
        return {
            ...state,
            mode: this.currentView,
            scale: this.scale,
            currentStep: this.currentStep,
        };
```

In `setState()` (lines 316–328), after `await super.setState(state, result);` add:
```ts
        if (typeof state.scale === 'number' && state.scale > 0) this.scale = state.scale;
        if (typeof state.currentStep === 'number') this.currentStep = state.currentStep;
```

- [ ] **Step 6: Reset session state on clear**

In `onunload()` (line 168) and `clear()` (line 281), after the existing `checkedIngredients` handling, ensure session resets. In `clear()` add at the end:
```ts
        this.scale = 1;
        this.currentStep = -1;
        this.checkedIngredients.clear();
```

- [ ] **Step 7: Build (expected to fail until Task 8)**

Run: `npm run build`
Expected: FAILS — `PreviewRenderer.render` still has the old 5-arg signature and `RenderContext` import is unused by it. This is expected; Task 8 updates `PreviewRenderer`. Do not commit yet.

> NOTE: Tasks 7 and 8 form one compilable unit. Implement Task 8 before building/committing. If you must commit Task 7 alone, temporarily keep the old `render` call — but the recommended path is to proceed straight to Task 8.

---

## Task 8: PreviewRenderer layout shell + render contract

Rewrites `PreviewRenderer` into a layout orchestrator and defines the shared `types.ts`. Sub-renderers are mounted here; Tasks 9–13 fill their bodies. To keep the build green, this task includes minimal working versions of each new renderer that are then expanded in their own tasks.

**Files:**
- Create: `src/renderers/types.ts`
- Rewrite: `src/renderers/PreviewRenderer.ts`

- [ ] **Step 1: Create the shared contract**

`src/renderers/types.ts` — exactly the "Shared render contract" block from the top of this plan.

- [ ] **Step 2: Rewrite `PreviewRenderer.ts`**

```ts
/**
 * PreviewRenderer — layout orchestrator.
 *
 * Emits the rich single-page layout: hero → sticky scaler bar → two-column
 * (ingredients | steps). Honors the layout settings; falls back to a stacked
 * single column when twoColumnLayout is off.
 */
import { App, TFile } from 'obsidian';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import { getSections, hasNamedSections } from '../utils/sectionHelpers';
import { findRecipeImages } from '../utils/imageHelpers';
import { HeroRenderer } from './HeroRenderer';
import { ScalerBarRenderer } from './ScalerBarRenderer';
import { IngredientListRenderer } from './IngredientListRenderer';
import { CookwareListRenderer } from './CookwareListRenderer';
import { TimerListRenderer } from './TimerListRenderer';
import { MethodStepsRenderer } from './MethodStepsRenderer';
import { MetadataRenderer } from './MetadataRenderer';
import type { RenderContext } from './types';

export class PreviewRenderer {
    private hero: HeroRenderer;
    private scalerBar: ScalerBarRenderer;
    private ingredientRenderer: IngredientListRenderer;
    private cookwareRenderer: CookwareListRenderer;
    private timerListRenderer: TimerListRenderer;
    private methodStepsRenderer: MethodStepsRenderer;
    private metadataRenderer: MetadataRenderer;

    constructor(
        private app: App,
        private settings: CooklangSettings,
        private timerService: TimerService,
    ) {
        this.buildRenderers();
    }

    private buildRenderers(): void {
        this.hero = new HeroRenderer(this.app, this.settings);
        this.scalerBar = new ScalerBarRenderer(this.settings);
        this.ingredientRenderer = new IngredientListRenderer(this.settings);
        this.cookwareRenderer = new CookwareListRenderer(this.settings);
        this.timerListRenderer = new TimerListRenderer(this.settings);
        this.methodStepsRenderer = new MethodStepsRenderer(this.app, this.settings, this.timerService);
        this.metadataRenderer = new MetadataRenderer(this.settings);
    }

    public updateSettings(settings: CooklangSettings): void {
        this.settings = settings;
        this.buildRenderers();
    }

    public render(container: HTMLElement, file: TFile | null, ctx: RenderContext): void {
        container.empty();
        container.addClass('cook-rich');

        const sections = getSections(ctx.recipe);
        const images = findRecipeImages(file);

        // Hero (title image, title, description, pills)
        this.hero.render(container, ctx, images.mainImage);

        // Sticky scaler/nav bar
        this.scalerBar.render(container, ctx);

        // Two-column (or stacked) body
        const cols = container.createDiv({ cls: 'cook-cols' });
        if (!this.settings.twoColumnLayout) cols.addClass('cook-cols-stacked');

        const aside = cols.createDiv({ cls: 'cook-aside' });
        this.ingredientRenderer.render(aside, ctx, sections);
        this.cookwareRenderer.render(aside, ctx.recipe);
        this.timerListRenderer.render(ctx.recipe, aside);

        const main = cols.createDiv({ cls: 'cook-main' });
        this.methodStepsRenderer.render(main, ctx, sections, file, images.allImages);

        // Leftover custom metadata ("More details")
        this.metadataRenderer.render(ctx.recipe, container);

        // Silence unused-warning for hasNamedSections import consumers (used by renderers)
        void hasNamedSections;
    }
}
```

- [ ] **Step 3: Replace the two updated renderers with concrete minimal bodies**

To keep the build green between tasks, replace the **entire** body of these two files with the concrete minimal versions below. Tasks 11 and 12 fully rewrite them — this is throwaway scaffolding, but it is complete and compilable (no placeholders).

Replace all of `src/renderers/IngredientListRenderer.ts` with:
```ts
import { CooklangSettings } from '../settings';
import { getFlatIngredients } from '../recipeHelpers';
import type { SectionView } from '../utils/sectionHelpers';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext, _sections: SectionView[]): void {
        if (!this.settings.showIngredientList) return;
        const items = getFlatIngredients(ctx.recipe);
        if (!items.length) return;
        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', { cls: 'cook-section-title', text: this.settings.ingredientLabel || 'Ingredients' });
        const ul = region.createEl('ul', { cls: 'cook-ing-list' });
        items.forEach(ing => {
            const li = ul.createEl('li', { cls: 'cook-ing' });
            li.createSpan({ cls: 'cook-ing-name', text: ing.name });
            if (ing.displayText) li.createSpan({ cls: 'cook-ing-qty', text: ing.displayText });
        });
    }
}
```

Replace all of `src/renderers/MethodStepsRenderer.ts` with:
```ts
import { App } from 'obsidian';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import type { SectionView, StepPart } from '../utils/sectionHelpers';
import type { TFile } from 'obsidian';
import type { RenderContext } from './types';

export class MethodStepsRenderer {
    constructor(
        private app: App,
        private settings: CooklangSettings,
        private timerService: TimerService,
    ) {}

    render(
        container: HTMLElement,
        _ctx: RenderContext,
        sections: SectionView[],
        _file: TFile | null,
        _allImages: TFile[],
    ): void {
        const region = container.createDiv({ cls: 'cook-steps' });
        region.id = 'cook-steps';
        region.createEl('h2', { cls: 'cook-section-title', text: this.settings.methodLabel || 'Method' });
        sections.forEach(section => {
            section.steps.forEach(step => {
                const li = region.createDiv({ cls: 'cook-step' });
                li.createSpan({ cls: 'cook-step-n', text: `${step.globalIndex + 1}.` });
                const body = li.createDiv({ cls: 'cook-step-text' });
                step.parts.forEach((part: StepPart) => {
                    if (part.type === 'text') body.appendText(part.value);
                    else if (part.type === 'ingredient') body.createSpan({ text: part.ingredient.name });
                    else if (part.type === 'cookware') body.createSpan({ text: part.cookware.name });
                    else if (part.type === 'timer') body.createSpan({ text: '⏱' });
                });
            });
        });
        void this.timerService; void this.app;
    }
}
```

> Note: this scaffolding already uses the `App`-in-constructor shape that Task 12 Step 2 finalizes, so `PreviewRenderer.buildRenderers()` must construct it as `new MethodStepsRenderer(this.app, this.settings, this.timerService)` (already shown in Step 2 above).

`HeroRenderer` and `ScalerBarRenderer` are created in Tasks 9–10; for this step create stub files so imports resolve:

`src/renderers/HeroRenderer.ts`:
```ts
import { App } from 'obsidian';
import { CooklangSettings } from '../settings';
import type { RenderContext } from './types';
import type { TFile } from 'obsidian';

export class HeroRenderer {
    constructor(private app: App, private settings: CooklangSettings) {}
    render(_container: HTMLElement, _ctx: RenderContext, _mainImage: TFile | null): void {}
}
```

`src/renderers/ScalerBarRenderer.ts`:
```ts
import { CooklangSettings } from '../settings';
import type { RenderContext } from './types';

export class ScalerBarRenderer {
    constructor(private settings: CooklangSettings) {}
    render(_container: HTMLElement, _ctx: RenderContext): void {}
}
```

> The temporary bodies above are scaffolding to keep the build green between tasks. Tasks 9–12 replace each stub/temporary body with the real implementation. This is intentional incremental wiring, not a placeholder left in final code.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds (Tasks 7 + 8 together compile).

- [ ] **Step 5: Manual smoke test in Obsidian**

Copy `main.js`, `manifest.json`, `styles.css` into a test vault's `.obsidian/plugins/cooklang-obsidian/` (or symlink the repo), enable the plugin, open `test-recipes/curry.cook`, toggle Preview. Expected: no crash; steps render (unstyled is fine at this stage).

- [ ] **Step 6: Commit**

```bash
git add src/cookView.ts src/renderers/types.ts src/renderers/PreviewRenderer.ts src/renderers/HeroRenderer.ts src/renderers/ScalerBarRenderer.ts src/renderers/IngredientListRenderer.ts src/renderers/MethodStepsRenderer.ts
git commit -m "feat: rich preview layout shell + render contract + cookview state"
```

---

## Task 9: HeroRenderer

**Files:**
- Rewrite: `src/renderers/HeroRenderer.ts`

- [ ] **Step 1: Implement the hero**

```ts
/**
 * HeroRenderer — title image, title, description, and meta pills.
 */
import { App, TFile } from 'obsidian';
import { CooklangSettings } from '../settings';
import { buildMetaPills } from '../utils/heroModel';
import type { RenderContext } from './types';

export class HeroRenderer {
    constructor(private app: App, private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext, mainImage: TFile | null): void {
        const hero = container.createDiv({ cls: 'cook-hero' });

        const body = hero.createDiv({ cls: 'cook-hero-body' });

        const title = ctx.recipe.title?.trim();
        body.createEl('h1', { cls: 'cook-hero-title', text: title || 'Recipe' });

        const description = ctx.recipe.description?.trim();
        if (description) {
            body.createEl('p', { cls: 'cook-hero-desc', text: description });
        }

        const pills = buildMetaPills(ctx.recipe, ctx.state.displayServings);
        if (pills.length) {
            const row = body.createDiv({ cls: 'cook-pills' });
            for (const pill of pills) {
                const cls = pill.kind === 'tag' ? 'cook-pill cook-pill-tag' : 'cook-pill';
                if (pill.url && pill.kind === 'source') {
                    const a = row.createEl('a', {
                        cls,
                        href: pill.url,
                        attr: { target: '_blank', rel: 'noopener' },
                    });
                    if (pill.icon) a.createSpan({ cls: 'cook-pill-icon', text: pill.icon });
                    a.appendText(pill.text);
                } else {
                    const el = row.createSpan({ cls });
                    if (pill.icon) el.createSpan({ cls: 'cook-pill-icon', text: pill.icon });
                    el.appendText(pill.text);
                }
            }
        }

        if (this.settings.showImages && mainImage) {
            const figure = hero.createDiv({ cls: 'cook-hero-image' });
            const img = figure.createEl('img');
            img.src = this.app.vault.getResourcePath(mainImage);
            img.alt = title || 'Recipe image';
        }
    }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual check**

Reload the plugin in the test vault, open `curry.cook` preview. Expected: title "Thai Green Curry", description, pills for time/servings/difficulty/source/course + `#dinner`/`#thai` tags, and `curry.jpg` as the hero image.

- [ ] **Step 4: Commit**

```bash
git add src/renderers/HeroRenderer.ts
git commit -m "feat: hero renderer with meta pills and title image"
```

---

## Task 10: ScalerBarRenderer

**Files:**
- Rewrite: `src/renderers/ScalerBarRenderer.ts`

- [ ] **Step 1: Implement the sticky bar**

```ts
/**
 * ScalerBarRenderer — sticky bar with section jump-links and a servings stepper.
 * The stepper is hidden when the recipe has no numeric servings or the setting
 * is off. Anchors target the #cook-ingredients / #cook-steps regions.
 */
import { CooklangSettings } from '../settings';
import { clampServings } from '../utils/scaling';
import type { RenderContext } from './types';

export class ScalerBarRenderer {
    constructor(private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext): void {
        const bar = container.createDiv({ cls: 'cook-bar' });

        const nav = bar.createDiv({ cls: 'cook-bar-nav' });
        const ingLink = nav.createEl('a', {
            cls: 'cook-bar-link',
            text: this.settings.ingredientLabel || 'Ingredients',
            href: '#cook-ingredients',
        });
        ingLink.addEventListener('click', (e) => {
            e.preventDefault();
            container.querySelector('#cook-ingredients')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        const stepLink = nav.createEl('a', {
            cls: 'cook-bar-link',
            text: this.settings.methodLabel || 'Steps',
            href: '#cook-steps',
        });
        stepLink.addEventListener('click', (e) => {
            e.preventDefault();
            container.querySelector('#cook-steps')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        const showScaler = this.settings.showServingsScaler
            && ctx.state.baseServings != null
            && ctx.state.displayServings != null;
        if (!showScaler) return;

        const current = ctx.state.displayServings as number;
        const stepper = bar.createDiv({ cls: 'cook-stepper' });

        const dec = stepper.createEl('button', { cls: 'cook-stepper-btn', text: '−' });
        dec.setAttr('aria-label', 'Fewer servings');
        dec.addEventListener('click', () => {
            ctx.callbacks.onScaleChange(clampServings(current - 1));
        });

        const val = stepper.createSpan({ cls: 'cook-stepper-val' });
        val.createEl('b', { text: String(current) });
        val.appendText(' ' + (this.settings.servingsLabel || 'servings'));

        const inc = stepper.createEl('button', { cls: 'cook-stepper-btn', text: '+' });
        inc.setAttr('aria-label', 'More servings');
        inc.addEventListener('click', () => {
            ctx.callbacks.onScaleChange(clampServings(current + 1));
        });
    }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual check**

Reload, open `curry.cook` preview. Expected: sticky bar with "Ingredients"/"Steps" links and a `[ − 4 servings + ]` stepper. Clicking `+`/`−` updates the count AND the ingredient/inline quantities (verified fully after Task 11). Anchors scroll to sections.

- [ ] **Step 4: Commit**

```bash
git add src/renderers/ScalerBarRenderer.ts
git commit -m "feat: sticky scaler bar with servings stepper and nav links"
```

---

## Task 11: IngredientListRenderer — sections, scaled quantities, name-keyed checks

**Files:**
- Rewrite: `src/renderers/IngredientListRenderer.ts`

- [ ] **Step 1: Implement section-aware checklist**

```ts
/**
 * IngredientListRenderer — checklist grouped by Cooklang section when the recipe
 * has named sections. Quantities come from the already-scaled recipe (CookView
 * re-parses with scale). Checkboxes are keyed by ingredient name so scaling /
 * re-render preserves checked state.
 */
import { CooklangSettings } from '../settings';
import { getFlatIngredients } from '../recipeHelpers';
import type { FlatIngredient } from '@cooklang/cooklang-ts';
import { hasNamedSections, type SectionView } from '../utils/sectionHelpers';
import type { RenderContext } from './types';

export class IngredientListRenderer {
    constructor(private settings: CooklangSettings) {}

    render(container: HTMLElement, ctx: RenderContext, sections: SectionView[]): void {
        if (!this.settings.showIngredientList) return;

        const all = getFlatIngredients(ctx.recipe);
        if (!all.length) return;

        const region = container.createDiv({ cls: 'cook-ingredients' });
        region.id = 'cook-ingredients';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.ingredientLabel || 'Ingredients',
        });

        if (hasNamedSections(sections) && sections.length > 1) {
            // Group ingredients by section using each section's ingredientIndices.
            sections.forEach(section => {
                const items = section.ingredientIndices
                    .map(i => all[i])
                    .filter((x): x is FlatIngredient => !!x);
                if (!items.length) return;
                if (section.name) {
                    region.createEl('h3', { cls: 'cook-subhead', text: section.name });
                }
                this.renderList(region, items, ctx);
            });
        } else {
            this.renderList(region, all, ctx);
        }
    }

    private renderList(parent: HTMLElement, items: FlatIngredient[], ctx: RenderContext): void {
        const ul = parent.createEl('ul', { cls: 'cook-ing-list' });
        const checked = ctx.state.checkedIngredients;

        items.forEach(ing => {
            const key = ing.name;
            const isChecked = checked.has(key);

            const li = ul.createEl('li', {
                cls: isChecked ? 'cook-ing done' : 'cook-ing',
            });
            li.createSpan({ cls: 'cook-ing-box' });
            li.createSpan({ cls: 'cook-ing-name', text: ing.name });
            if (ing.displayText) {
                const qty = ing.unit ? `${ing.displayText} ${ing.unit}` : ing.displayText;
                li.createSpan({ cls: 'cook-ing-qty', text: qty });
            }

            li.addEventListener('click', () => {
                if (checked.has(key)) checked.delete(key);
                else checked.add(key);
                ctx.callbacks.onIngredientToggle();
            });
        });
    }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual check**

Reload, open `curry.cook` preview. Expected: ingredients grouped under "Curry paste" / "Cooking"; clicking an item strikes it through and survives a `+`/`−` scale change; quantities double when servings double (e.g. coconut milk 400 ml → 800 ml).

- [ ] **Step 4: Commit**

```bash
git add src/renderers/IngredientListRenderer.ts
git commit -m "feat: section-grouped ingredient checklist with scaled quantities"
```

---

## Task 12: MethodStepsRenderer — sections, notes, per-step images, step tracking

**Files:**
- Rewrite: `src/renderers/MethodStepsRenderer.ts`

- [ ] **Step 1: Implement the rich steps**

```ts
/**
 * MethodStepsRenderer — section bands, note callouts, numbered steps with inline
 * ingredients/cookware/timers, per-step images, and current-step tracking.
 */
import { App, TFile } from 'obsidian';
import { CooklangSettings } from '../settings';
import { TimerService } from '../services/TimerService';
import {
    ingredient_display_name,
    cookware_display_name,
    quantity_display,
    getQuantityValue,
} from '../recipeHelpers';
import { formatTime, createUnitMap } from '../utils/timeFormatters';
import type { SectionView, StepView, StepPart } from '../utils/sectionHelpers';
import { getStepImageFor } from '../utils/stepImages';
import type { RenderContext } from './types';

export class MethodStepsRenderer {
    constructor(
        private app: App,
        private settings: CooklangSettings,
        private timerService: TimerService,
    ) {}

    render(
        container: HTMLElement,
        ctx: RenderContext,
        sections: SectionView[],
        file: TFile | null,
        allImages: TFile[],
    ): void {
        const region = container.createDiv({ cls: 'cook-steps' });
        region.id = 'cook-steps';
        region.createEl('h2', {
            cls: 'cook-section-title',
            text: this.settings.methodLabel || 'Method',
        });

        const unitMap = createUnitMap(
            this.settings.minutesLabel || 'm,min,minute,minutes',
            this.settings.hoursLabel || 'h,hr,hrs,hour,hours',
        );

        sections.forEach(section => {
            if (section.name && sections.length > 1) {
                region.createEl('div', { cls: 'cook-section-band', text: section.name });
            }

            section.steps.forEach(step => {
                this.renderStep(region, step, ctx, unitMap, file, allImages);
            });

            section.notes.forEach(note => {
                const callout = region.createDiv({ cls: 'cook-note' });
                callout.createSpan({ cls: 'cook-note-icon', text: '💡' });
                callout.createSpan({ cls: 'cook-note-text', text: note });
            });
        });
    }

    private renderStep(
        region: HTMLElement,
        step: StepView,
        ctx: RenderContext,
        unitMap: Record<string, number>,
        file: TFile | null,
        allImages: TFile[],
    ): void {
        const tracking = this.settings.enableStepTracking;
        const isCurrent = tracking && ctx.state.currentStep === step.globalIndex;
        const isDone = tracking && ctx.state.currentStep > step.globalIndex;

        const li = region.createDiv({
            cls: 'cook-step' + (isCurrent ? ' cur' : '') + (isDone ? ' done' : ''),
        });

        li.createSpan({ cls: 'cook-step-n', text: `${step.globalIndex + 1}.` });

        const bodyWrap = li.createDiv({ cls: 'cook-step-bodywrap' });
        const body = bodyWrap.createDiv({ cls: 'cook-step-text' });
        step.parts.forEach(part => this.renderPart(body, part, unitMap));

        // Per-step image
        if (this.settings.showImages && file) {
            const img = getStepImageFor(step.globalIndex, file.basename, allImages);
            if (img) {
                const fig = bodyWrap.createDiv({ cls: 'cook-step-image' });
                const el = fig.createEl('img');
                el.src = this.app.vault.getResourcePath(img);
                el.alt = '';
            }
        }

        if (tracking) {
            li.addEventListener('click', () => ctx.callbacks.onStepActivate(step.globalIndex));
        }
    }

    private renderPart(body: HTMLElement, part: StepPart, unitMap: Record<string, number>): void {
        if (part.type === 'text') {
            body.appendText(part.value);
            return;
        }
        const span = body.createEl('span');
        if (part.type === 'ingredient') {
            span.addClass('cook-ig');
            span.appendText(ingredient_display_name(part.ingredient));
            if (this.settings.highlightIngredientCookware) span.addClass('cook-ig-hl');
            if (this.settings.showQuantitiesInline && part.ingredient.quantity) {
                span.appendText(' ');
                span.createEl('span', {
                    cls: 'cook-amt',
                    text: '(' + quantity_display(part.ingredient.quantity) + ')',
                });
            }
        } else if (part.type === 'cookware') {
            span.addClass('cook-cw');
            span.appendText(cookware_display_name(part.cookware));
            if (this.settings.highlightIngredientCookware) span.addClass('cook-cw-hl');
        } else if (part.type === 'timer') {
            this.renderTimer(span, part.timer, unitMap);
        }
    }

    private renderTimer(span: HTMLElement, timer: any, unitMap: Record<string, number>): void {
        span.addClass('cook-timer');
        let target: HTMLElement = span;
        if (this.settings.showTimersInline) {
            target = span.createEl('button', { cls: 'cook-timer-btn' });
        }
        target.appendText('⏱');
        const numericQty = getQuantityValue(timer.quantity);
        if (numericQty !== null) {
            target.appendText(' ');
            const unit = timer.quantity?.unit;
            const multiplier = unit ? unitMap[String(unit).toLowerCase()] ?? 1 : 1;
            const seconds = numericQty * multiplier;
            target.createEl('span', { cls: 'cook-amt', text: formatTime(seconds) });
            if (target instanceof HTMLButtonElement) {
                this.timerService.attachTimerToButton(target, seconds, timer.name ?? '');
            }
        }
        if (timer.name) {
            target.appendText(' ');
            target.createEl('span', { cls: 'cook-timer-name', text: timer.name });
        }
    }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success. (`PreviewRenderer.buildRenderers()` already constructs `new MethodStepsRenderer(this.app, this.settings, this.timerService)` from Task 8 — no change needed there.)

- [ ] **Step 3: Manual check**

Reload, open `curry.cook` preview. Expected: section bands "Curry paste"/"Cooking"; the note "Make double and freeze." as a callout; inline ingredients green, cookware orange (when highlight setting on); a clickable timer chip; `curry.0.png` shown under the first step; clicking a step highlights it as current and dims earlier steps; clicking again clears it.

- [ ] **Step 4: Commit**

```bash
git add src/renderers/MethodStepsRenderer.ts
git commit -m "feat: rich method steps with sections, notes, images, step tracking"
```

---

## Task 13: MetadataRenderer "More details" + cookware/timer placement

Repurpose `MetadataRenderer` to show only leftover custom metadata (keys not already represented by the hero/typed fields) in a collapsible block, so nothing is lost.

**Files:**
- Rewrite: `src/renderers/MetadataRenderer.ts`

- [ ] **Step 1: Implement the leftover-metadata block**

```ts
/**
 * MetadataRenderer — collapsible "More details" for custom metadata keys not
 * already surfaced as hero pills / typed fields.
 */
import type { CooklangRecipe } from '@cooklang/cooklang-ts';
import { CooklangSettings } from '../settings';
import { isValidUrl } from '../utils/urlValidators';
import { getMetadata } from '../recipeHelpers';

// Keys already shown in the hero or handled elsewhere.
const SHOWN_KEYS = new Set([
    'title', 'description', 'servings', 'serves', 'yield', 'time', 'prep time',
    'prep_time', 'cook time', 'cook_time', 'tags', 'tag', 'source', 'author',
    'difficulty', 'course', 'cuisine', 'diet', 'images', 'image', 'introduction',
]);

export class MetadataRenderer {
    constructor(private settings: CooklangSettings) {}

    render(recipe: CooklangRecipe, container: HTMLElement): void {
        const metadata = getMetadata(recipe);
        const entries = Object.entries(metadata)
            .filter(([key]) => !SHOWN_KEYS.has(key.toLowerCase().trim()));
        if (!entries.length) return;

        const details = container.createEl('details', { cls: 'cook-more' });
        details.createEl('summary', {
            cls: 'cook-more-summary',
            text: this.settings.metadataLabel || 'More details',
        });
        const ul = details.createEl('ul', { cls: 'cook-more-list' });

        entries.forEach(([key, value]) => {
            const li = ul.createEl('li');
            li.createSpan({ cls: 'cook-more-key', text: key });
            if (isValidUrl(value)) {
                li.createEl('a', {
                    text: value,
                    attr: { href: value, target: '_blank', rel: 'noopener' },
                });
            } else {
                li.appendText(String(value));
            }
        });
    }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual check**

Add a custom key to `curry.cook` frontmatter (e.g. `equipment note: cast iron preferred`), reload. Expected: a collapsible "More details" with that key; standard keys (servings/time/tags/etc.) are NOT duplicated there.

- [ ] **Step 4: Commit**

```bash
git add src/renderers/MetadataRenderer.ts
git commit -m "feat: collapsible more-details for leftover metadata"
```

---

## Task 14: Styles + theme polish

Add all rich-layout CSS using only Obsidian variables, then verify across light/dark/a custom theme.

**Files:**
- Modify: `src/styles.scss`

- [ ] **Step 1: Append the rich-layout styles**

Append to `src/styles.scss`:
```scss
/* ===== Rich Cooklang preview ===== */
/* `cook-rich` is added to the .cook-preview-view element itself, so this must be
   a compound selector (no descendant combinator) or container-type won't apply. */
.cook-preview-view.cook-rich {
  container-type: inline-size;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--size-4-4, 16px) var(--size-4-8, 32px);
  color: var(--text-normal);
}

/* Hero */
.cook-hero {
  display: flex;
  flex-wrap: wrap-reverse;
  align-items: center;
  gap: var(--size-4-6, 24px);
  padding: var(--size-4-6, 24px) 0;
}
.cook-hero-body { flex: 1 1 260px; min-width: 0; }
.cook-hero-title { margin: 0 0 var(--size-4-2, 8px); font-size: 1.9em; line-height: 1.15; }
.cook-hero-desc { margin: 0 0 var(--size-4-3, 12px); color: var(--text-muted); max-width: 60ch; }
.cook-hero-image { flex: 1 1 240px; max-width: 42%; }
.cook-hero-image img { width: 100%; height: auto; border-radius: var(--radius-l, 12px); object-fit: cover; }

/* Pills */
.cook-pills { display: flex; flex-wrap: wrap; gap: var(--size-2-2, 6px); }
.cook-pill {
  display: inline-flex; align-items: center; gap: 5px;
  height: 26px; padding: 0 11px;
  background: var(--background-secondary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 13px; font-size: 0.8em; color: var(--text-muted);
  text-decoration: none;
}
a.cook-pill:hover { color: var(--text-normal); border-color: var(--text-accent); }
.cook-pill-icon { opacity: 0.85; }
.cook-pill-tag { background: transparent; border-color: var(--text-accent); color: var(--text-accent); }

/* Sticky bar */
.cook-bar {
  position: sticky; top: 0; z-index: 5;
  display: flex; align-items: center; gap: var(--size-4-4, 16px);
  padding: var(--size-2-3, 8px) 0;
  background: var(--background-primary);
  border-top: 1px solid var(--background-modifier-border);
  border-bottom: 1px solid var(--background-modifier-border);
}
.cook-bar-nav { display: flex; gap: var(--size-4-4, 16px); }
.cook-bar-link { font-size: 0.85em; font-weight: 600; color: var(--text-muted); text-decoration: none; }
.cook-bar-link:hover { color: var(--text-accent); }
.cook-stepper {
  margin-left: auto; display: flex; align-items: center; gap: 6px;
  border: 1px solid var(--background-modifier-border); border-radius: 14px; height: 30px; padding: 0 6px;
}
.cook-stepper-btn {
  width: 22px; height: 22px; border: none; border-radius: 50%;
  background: transparent; color: var(--text-muted); font-size: 1em; cursor: pointer; line-height: 1;
}
.cook-stepper-btn:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
.cook-stepper-val { font-size: 0.85em; font-variant-numeric: tabular-nums; }
.cook-stepper-val b { color: var(--text-normal); }

/* Two-column layout */
.cook-cols { display: block; padding-top: var(--size-4-5, 20px); }
@container (min-width: 600px) {
  .cook-cols:not(.cook-cols-stacked) {
    display: grid; grid-template-columns: 240px 1fr; gap: var(--size-4-8, 32px); align-items: start;
  }
  .cook-cols:not(.cook-cols-stacked) .cook-aside { position: sticky; top: 56px; }
}

/* Section titles + bands */
.cook-section-title {
  font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--text-faint); font-weight: 700; margin: 0 0 var(--size-4-3, 12px);
}
.cook-subhead {
  font-size: 0.72em; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--text-faint); font-weight: 700; margin: var(--size-4-3, 12px) 0 4px;
}
.cook-section-band {
  font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.07em;
  color: var(--text-accent); font-weight: 700; margin: var(--size-4-4, 16px) 0 4px;
}

/* Ingredient checklist */
.cook-ing-list { list-style: none; margin: 0; padding: 0; }
.cook-ing {
  display: flex; align-items: center; gap: 10px; padding: 7px 0; cursor: pointer;
  border-bottom: 1px solid var(--background-modifier-border); font-size: 0.92em;
}
.cook-ing:last-child { border-bottom: none; }
.cook-ing-box {
  width: 17px; height: 17px; flex: none; border-radius: 5px;
  border: 1.5px solid var(--text-faint);
}
.cook-ing.done .cook-ing-box {
  background: var(--interactive-accent); border-color: var(--interactive-accent); position: relative;
}
.cook-ing.done .cook-ing-box::after {
  content: '✓'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: var(--text-on-accent); font-size: 0.7em;
}
.cook-ing-name { flex: 1; }
.cook-ing.done .cook-ing-name { text-decoration: line-through; color: var(--text-faint); }
.cook-ing-qty { color: var(--text-muted); font-variant-numeric: tabular-nums; font-size: 0.85em; }

/* Steps */
.cook-step {
  display: flex; gap: var(--size-4-4, 16px); padding: var(--size-4-3, 12px) 0;
  border-bottom: 1px solid var(--background-modifier-border);
}
.cook-step.cur {
  background: var(--background-modifier-hover);
  box-shadow: inset 3px 0 0 var(--interactive-accent);
  border-radius: 0 8px 8px 0; padding-left: 12px; margin-left: -12px;
}
.cook-step.done { opacity: 0.5; }
.cook-step-n { flex: none; color: var(--text-accent); font-weight: 700; }
.cook-step-bodywrap { flex: 1; min-width: 0; }
.cook-step-text { line-height: 1.6; }
.cook-step-image { margin-top: var(--size-4-2, 8px); }
.cook-step-image img { max-width: 100%; border-radius: var(--radius-m, 8px); }

/* Inline components */
.cook-ig-hl { color: var(--color-green, var(--text-accent)); font-weight: 600; }
.cook-cw-hl { color: var(--color-orange, var(--text-accent)); font-weight: 600; }
.cook-amt { color: var(--text-muted); }
.cook-timer-btn {
  background: transparent; border: 1px solid var(--text-accent); color: var(--text-accent);
  border-radius: 11px; padding: 1px 8px; font-size: 0.9em; cursor: pointer;
}

/* Notes */
.cook-note {
  display: flex; gap: 10px; padding: 10px 12px; margin: var(--size-4-2, 8px) 0;
  background: var(--background-secondary); border-left: 3px solid var(--interactive-accent);
  border-radius: 0 6px 6px 0; color: var(--text-muted); font-size: 0.9em;
}

/* More details */
.cook-more { margin-top: var(--size-4-6, 24px); }
.cook-more-summary { cursor: pointer; color: var(--text-muted); font-size: 0.85em; }
.cook-more-list { list-style: none; margin: var(--size-4-2, 8px) 0 0; padding: 0; }
.cook-more-list li { padding: 3px 0; color: var(--text-muted); font-size: 0.85em; }
.cook-more-key { font-weight: 600; color: var(--text-normal); margin-right: 6px; text-transform: capitalize; }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; `styles.css` regenerated.

- [ ] **Step 3: Manual theme verification**

Reload the plugin, open `curry.cook` preview and check:
- Default dark theme: matches the approved mockup (hero, pills, sticky bar, two columns, highlights, notes, step image, current-step highlight).
- Switch to default light theme (Settings → Appearance): everything stays readable, colors derive from theme.
- Install/enable any community theme: layout still looks native (no clashing hardcoded colors).
- Narrow the pane to < 600px wide: columns collapse to one (ingredients then steps); sticky bar + stepper remain usable.

- [ ] **Step 4: Commit**

```bash
git add src/styles.scss styles.css
git commit -m "feat: rich preview styles using Obsidian theme variables"
```

---

## Task 15: Docs + changelog + final verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update CHANGELOG**

Prepend an entry to `CHANGELOG.md` describing the redesign:
```markdown
## [Unreleased]
- Redesigned recipe preview: hero with title image and meta pills, sticky servings
  scaler, two-column ingredients/steps layout, Cooklang section & note support,
  per-step images, and current-step tracking. Fully themed via Obsidian variables.
- New settings: Servings scaler, Two-column layout, Step tracking, Servings label.
```

- [ ] **Step 2: Update README**

Add a short "Rich preview" subsection to `README.md` documenting the scaler, two-column layout, sections/notes, per-step images (`Recipe.0.jpg` convention), and the new settings toggles.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all unit tests pass (sectionHelpers, stepImages, scaling, heroModel, smoke).

- [ ] **Step 4: Final production build**

Run: `npm run build`
Expected: success, no warnings about unused symbols in the new files.

- [ ] **Step 5: Full manual regression**

In the test vault, verify with multiple recipes:
- `curry.cook` (multi-section, notes, images, servings).
- A recipe with NO servings metadata → scaler hidden, layout intact.
- A recipe with NO metadata → hero shows file-based title only, no pills.
- A single-section recipe → no section bands, flat ingredient list.
- Toggle each new setting off → falls back to simple stacked behavior.

- [ ] **Step 6: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: document rich preview redesign and new settings"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** Hero+pills (T5,T9), title image (T9), step images (T3,T12), scaler (T4,T7,T10), two-column + responsive (T8,T14), sections & notes (T2,T11,T12), step tracking (T7,T12), native theming (T14), settings (T6), leftover metadata (T13).
- **Type consistency:** `RenderContext`/`PreviewState`/`PreviewCallbacks` (T8) are used unchanged by every renderer. `SectionView`/`StepView`/`StepPart` (T2) used by T11,T12. `getStepImageFor(stepIndex, recipeBasename, images)` (T3) called in T12. `clampServings`/`computeScale`/`parseServingsValue` (T4) used in T7,T10.
- **Scale + checks:** checkboxes keyed by `ing.name` (T11) so re-parse on scale keeps state (T7).
- **Known follow-ups (out of scope):** wake-lock "cook mode"; print/export; automated DOM tests.
