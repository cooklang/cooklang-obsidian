import { App, SuggestModal } from 'obsidian';
import { RECIPE_FORMATS, type RecipeFormat } from '../utils/recipeFiles';

export class RecipeFormatModal extends SuggestModal<RecipeFormat> {
    constructor(app: App, private current: RecipeFormat, private choose: (format: RecipeFormat) => void) {
        super(app);
        this.setPlaceholder('Convert recipe to…');
    }

    getSuggestions(query: string): RecipeFormat[] {
        return RECIPE_FORMATS.filter(format => format !== this.current && format.includes(query.toLowerCase()));
    }

    renderSuggestion(format: RecipeFormat, el: HTMLElement): void {
        el.setText(format === 'md' ? '.md — Markdown with recipe: true' : `.${format}`);
    }

    onChooseSuggestion(format: RecipeFormat): void { this.choose(format); }
}
