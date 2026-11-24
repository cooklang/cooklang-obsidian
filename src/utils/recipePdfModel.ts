import type { CooklangRecipe, Item, Quantity } from '@cooklang/cooklang';
import { ingredient_should_be_listed, grouped_quantity_display, grouped_quantity_is_empty } from '@cooklang/cooklang';
import { formatDuration } from './heroModel';
export type TextRange = [number, number];
type Entry = { note: string } | { text: string; timers: string[]; ingredientRanges?: TextRange[] };

// The WASM declaration calls this `Number`, but the runtime returns a tagged value.
type CookNumber = { type: 'regular'; value: number } | { type: 'fraction'; value: { whole: number; num: number; den: number } };
function numeric(value: unknown) {
  const n = value as CookNumber;
  if (n.type === 'regular') return String(n.value);
  const { whole, num, den } = n.value;
  return [whole || '', num ? num + '/' + den : ''].filter(Boolean).join(' ') || '0';
}

function amount(q: Quantity | null) {
  if (!q) return '';
  const v = q.value;
  let value;
  if (v.type === 'number') value = numeric(v.value);
  else if (v.type === 'range') value = numeric(v.value.start) + '–' + numeric(v.value.end);
  else value = String(v.value);
  return [value, q.unit].filter(Boolean).join(' ');
}

export function recipeSections(recipe: CooklangRecipe, modelInlineQuantities = false) {
  // Place grouped totals at the definition's section. Definitions outside method
  // steps belong to the first section, so ingredient-only mode is included too.
  const sections = recipe.sections.length ? recipe.sections : [{ name: null, content: [] }];
  const rows = sections.map(() => [] as string[]);
  for (const [ingredient, quantity] of recipe.groupedIngredients) {
    if (!ingredient_should_be_listed(ingredient)) continue;
    const index = recipe.ingredients.indexOf(ingredient);
    const sectionIndex = sections.findIndex(section => section.content.some(entry =>
      entry.type === 'step' && entry.value.items.some(part => part.type === 'ingredient' && part.index === index)));
    rows[Math.max(0, sectionIndex)].push([
      grouped_quantity_is_empty(quantity) ? '' : grouped_quantity_display(quantity),
      ingredient.alias || ingredient.name,
      ingredient.note ? '(' + ingredient.note + ')' : ''
    ].filter(Boolean).join(' '));
  }
  const label = (item: { alias: string | null; name: string }) => item.alias || item.name;
  return sections.map((section, sectionIndex) => {
    const ingredients = rows[sectionIndex];
    const entries: Entry[] = section.content.map(entry => {
      if (entry.type === 'text') return { note: entry.value.replace(/\n[ \t]*>[ \t]?/g, '\n') };
      const timers: string[] = [];
      function renderPart(part: Item) {
        switch (part.type) {
          case 'text': return part.value;
          case 'inlineQuantity': return amount(recipe.inlineQuantities[part.index]);
          case 'cookware': return label(recipe.cookware[part.index]);
          case 'timer': {
            const timer = recipe.timers[part.index];
            const duration = amount(timer.quantity);
            if (duration) timers.push(duration);
            return [duration, timer.name].filter(Boolean).join(' ');
          }
          case 'ingredient': {
            const ing = recipe.ingredients[part.index];
            return modelInlineQuantities && ing.quantity ? label(ing) + ' (' + amount(ing.quantity) + ')' : label(ing);
          }
          default: throw new Error('Unsupported Cooklang step item');
        }
      }
      const ingredientRanges: TextRange[] = [];
      let text = '';
      for (const part of entry.value.items) {
        if (part.type === 'ingredient') {
          const name = label(recipe.ingredients[part.index]);
          ingredientRanges.push([text.length,text.length + name.length]);
        }
        text += renderPart(part);
      }
      return ingredientRanges.length ? { text, timers, ingredientRanges } : { text, timers };
    });
    return { name: section.name, ingredients, entries };
  });
}


export function recipePdfDetails(recipe: CooklangRecipe, state?: { scale: number; displayServings: number | null }): string[] {
  const servings = state?.displayServings ?? recipe.servings;
  const rawYield = (state?.scale ?? 1) === 1 ? recipe.rawMetadata.get('yield') : null;
  const yieldText = rawYield == null ? '' : String(rawYield).trim();
  const details = [servings != null && !/servings?/i.test(yieldText) ? 'Serves ' + servings : '', yieldText];
  if (typeof recipe.time === 'number') details.push(formatDuration(recipe.time));
  else if (recipe.time) {
    if (recipe.time.prep_time != null) details.push('Prep ' + formatDuration(recipe.time.prep_time));
    if (recipe.time.cook_time != null) details.push('Cook ' + formatDuration(recipe.time.cook_time));
  } else {
    const time = recipe.rawMetadata.get('total_time') ?? recipe.rawMetadata.get('time');
    if (time != null) details.push(typeof time === 'number' ? formatDuration(time) : String(time));
  }
  return details.filter(value => value.trim());
}
