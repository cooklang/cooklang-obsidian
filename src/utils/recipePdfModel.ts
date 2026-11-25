import type { CooklangRecipe, Item, Quantity } from '@cooklang/cooklang';
import { ingredient_should_be_listed, quantity_display } from '@cooklang/cooklang';
import { formatDuration } from './heroModel';
import { ingredientToAggInput } from './ingredientRows';
import { aggregateIngredients, type AggInput } from './ingredientAggregator';
export type TextRange = [number, number];
type Entry = { note: string } | { text: string; timers: string[]; ingredientRanges?: TextRange[] };

function amount(q: Quantity | null) {
  return q ? quantity_display(q) : '';
}

export function recipeSections(recipe: CooklangRecipe, modelInlineQuantities = false) {
  // Place grouped totals at the definition's section. Definitions outside method
  // steps belong to the first section, so ingredient-only mode is included too.
  const sections = recipe.sections.length ? recipe.sections : [{ name: null, content: [] }];
  const rows = sections.map(() => [] as AggInput[]);
  for (const [ingredient, quantity] of recipe.groupedIngredients) {
    if (!ingredient_should_be_listed(ingredient)) continue;
    const index = recipe.ingredients.indexOf(ingredient);
    const sectionIndex = sections.findIndex(section => section.content.some(entry =>
      entry.type === 'step' && entry.value.items.some(part => part.type === 'ingredient' && part.index === index)));
    const quantities = [...Object.values(quantity.known), ...Object.values(quantity.unknown), quantity.no_unit, ...quantity.other]
      .filter((value): value is Quantity => value !== null);
    for (const total of quantities.length ? quantities : [null]) {
      rows[Math.max(0, sectionIndex)].push(ingredientToAggInput({ ...ingredient, quantity: total }));
    }
  }
  const label = (item: { alias: string | null; name: string }) => item.alias || item.name;
  return sections.map((section, sectionIndex) => {
    const ingredients = aggregateIngredients(rows[sectionIndex]).map(row => {
      const preparations = row.preparations.map(preparation => row.preparations.length > 1 || preparation.displayQty !== row.displayQty
        ? [preparation.displayQty, preparation.name].filter(Boolean).join(' ')
        : preparation.name).join('; ');
      return [row.displayQty, row.name, preparations ? '(' + preparations + ')' : ''].filter(Boolean).join(' ');
    });
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
