# Library Extraction Analysis

## Goal
Identify reusable functionality from the Obsidian plugin that could be moved to `cooklang-rs/typescript` to benefit all TypeScript/JavaScript users of the cooklang parser.

## What Already Exists in `@cooklang/cooklang-ts`

The TypeScript package already provides excellent helper functions:

### Display Functions (WASM exports)
- ✅ **`quantity_display(quantity: Quantity): string`** - Formats a quantity for display (handles numbers, ranges, text, units)
- ✅ **`grouped_quantity_display(quantity: GroupedQuantity): string`** - Formats grouped quantities
- ✅ **`ingredient_display_name(ingredient: Ingredient): string`** - Gets proper ingredient name
- ✅ **`cookware_display_name(cookware: Cookware): string`** - Gets proper cookware name
- ✅ **`ingredient_should_be_listed(ingredient: Ingredient): boolean`** - Checks if ingredient should appear in lists
- ✅ **`cookware_should_be_listed(cookware: Cookware): boolean`** - Checks if cookware should appear in lists
- ✅ **`grouped_quantity_is_empty(quantity: GroupedQuantity): boolean`** - Checks if a grouped quantity is empty

### Classes
- ✅ **`CooklangParser`** - Main parser class with WASM initialization
- ✅ **`CooklangRecipe`** - Recipe wrapper with organized data
- ✅ **`HTMLRenderer`** - Complete HTML rendering implementation

## Issues Found in the Obsidian Plugin

### 🔴 Not Using Library Functions

The Obsidian plugin is **NOT using** the existing `quantity_display()` function! Instead, it does:

```typescript
// Current (suboptimal):
li.createEl('span', {cls: 'amount', text: String(ingredient.quantity)});

// Should use:
import { quantity_display } from '@cooklang/cooklang-ts';
li.createEl('span', {cls: 'amount', text: quantity_display(ingredient.quantity)});
```

**Problems with current approach:**
1. Doesn't handle ranges properly (e.g., "1-2 cups" becomes "[object Object]")
2. Doesn't format fractions nicely
3. Duplicates logic that's already in the WASM layer
4. Loses display hints and formatting

### Location References
- `src/cookView.ts:456` - Ingredient quantities
- `src/cookView.ts:478` - Cookware quantities
- `src/cookView.ts:553` - Inline ingredient quantities
- `src/cookView.ts:565` - Inline cookware quantities

## What Could Be Extracted to the Library

### 1. ✅ Already Exists - Use It!

**Nothing needs to be extracted for basic rendering.** The library already has comprehensive display functions that the Obsidian plugin should start using.

### 2. 🟡 Potentially Useful - Value Extraction Helpers

The plugin has these helper functions in `recipeHelpers.ts`:

```typescript
export function extractNumericValue(value: Value): number | null
export function extractQuantity(quantity: Quantity | null): { value: number | null; unit: string | null }
```

**Analysis:**
- Useful for applications that need numeric values (e.g., for calculations, scaling, nutrition)
- Currently handles the WASM type structure complexity
- Could be added as optional exports from the library

**Recommendation:** Extract to library as:
```typescript
// In typescript/index.ts
export function getNumericValue(value: Value): number | null {
    if (!value) return null;

    if (value.type === 'number') {
        return Number((value.value as any).value);
    } else if (value.type === 'range') {
        // Return start of range
        return Number((value.value as any).start.value);
    }
    return null;
}

export function getQuantityValue(quantity: Quantity | null): number | null {
    return quantity ? getNumericValue(quantity.value) : null;
}

export function getQuantityUnit(quantity: Quantity | null): string | null {
    return quantity?.unit ?? null;
}
```

### 3. 🟡 Potentially Useful - Flattening Helpers

The plugin provides these flattening functions:

```typescript
export function getMetadata(recipe: CooklangRecipe): Record<string, string>
export function getIngredients(recipe: CooklangRecipe): Array<{name, quantity, units}>
export function getCookware(recipe: CooklangRecipe): Array<{name, quantity}>
export function getTimers(recipe: CooklangRecipe): Array<{name, quantity, units}>
export function getSteps(recipe: CooklangRecipe): Array<Array<StepPart>>
```

**Analysis:**
- Simplifies the nested recipe structure for simple use cases
- Useful for applications that just want flat lists
- However, loses some information (e.g., notes, sections, grouped quantities)

**Recommendation:** Consider adding as optional utilities:
```typescript
// In typescript/index.ts or new typescript/helpers.ts

/**
 * Get a simple flat list of ingredients with numeric quantities.
 * Use this for simple displays. For full control, use recipe.groupedIngredients.
 */
export function getFlatIngredients(recipe: CooklangRecipe) {
    return recipe.ingredients.map(ing => ({
        name: ingredient_display_name(ing),
        quantity: getQuantityValue(ing.quantity),
        unit: getQuantityUnit(ing.quantity),
        displayText: ing.quantity ? quantity_display(ing.quantity) : null,
        note: ing.note
    }));
}
```

### 4. 🟢 Domain-Specific - Keep in Plugin

**Time formatting and timer functionality** should stay in the Obsidian plugin:
- `formatTime(seconds: number): string` - Formats seconds to HH:MM:SS
- `makeTimer(button, seconds, name)` - Creates interactive timer with audio

These are UI-specific and not relevant for a parser library.

## Recommendations

### For the Obsidian Plugin (Immediate)

1. **Use existing library functions:**
   ```typescript
   import {
       quantity_display,
       ingredient_display_name,
       cookware_display_name
   } from '@cooklang/cooklang-ts';

   // Replace all String(quantity) with quantity_display(quantity)
   // Replace manual name extraction with *_display_name() functions
   ```

2. **Keep numeric extraction helpers** for calculations (scaling ingredients, timer conversions)

3. **Simplify `recipeHelpers.ts`** once library functions are used

### For cooklang-rs/typescript Library

1. **Export value extraction helpers:**
   ```typescript
   export { getNumericValue, getQuantityValue, getQuantityUnit }
   ```
   - Useful for applications doing calculations
   - Handles WASM type complexity
   - Provides clean API for common operations

2. **Consider adding simple flat list helpers:**
   ```typescript
   export { getFlatIngredients, getFlatCookware, getFlatTimers }
   ```
   - Makes simple use cases easier
   - Still recommend using full API for complex applications
   - Document limitations (no grouping, no sections)

3. **Add TypeScript examples** in documentation showing:
   - How to use display functions
   - When to use flat helpers vs full API
   - How to extract numeric values for calculations

## Example Migration

**Before (Obsidian plugin):**
```typescript
ingredients.forEach(ingredient => {
    const li = ul.createEl('li');
    if (ingredient.quantity !== undefined && ingredient.quantity !== null) {
        li.createEl('span', {cls: 'amount', text: String(ingredient.quantity)});
        li.appendText(' ');
    }
    if (ingredient.units !== undefined && ingredient.units !== null) {
        li.createEl('span', {cls: 'unit', text: String(ingredient.units)});
        li.appendText(' ');
    }
    li.appendText(ingredient.name ?? '');
});
```

**After (using library functions):**
```typescript
import { quantity_display, ingredient_display_name } from '@cooklang/cooklang-ts';

recipe.groupedIngredients.forEach(([ingredient, quantity]) => {
    if (!ingredient_should_be_listed(ingredient)) return;

    const li = ul.createEl('li');
    const quantityText = grouped_quantity_display(quantity);
    if (quantityText) {
        li.createEl('span', {cls: 'amount', text: quantityText});
        li.appendText(' ');
    }
    li.appendText(ingredient_display_name(ingredient));
});
```

## Summary

| Category | Action | Priority |
|----------|--------|----------|
| Display functions | ✅ Already in library - **use them!** | 🔴 High |
| Numeric value extraction | Extract to library | 🟡 Medium |
| Flat list helpers | Consider for library | 🟢 Low |
| Timer/UI functionality | Keep in plugin | - |

**Immediate next steps:**
1. Fix Obsidian plugin to use `quantity_display()` and other library functions
2. Propose extracting numeric value helpers to library (PR to cooklang-rs)
3. Add better TypeScript examples to library documentation
