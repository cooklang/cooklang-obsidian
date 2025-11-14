import {
    version,
    Parser,
    NameAndUrl,
    RecipeTime,
    Servings, Section, Ingredient, Cookware, Timer, Quantity, ScaledRecipeWithReport, GroupedQuantity,
    ingredient_should_be_listed, ingredient_display_name, grouped_quantity_is_empty, grouped_quantity_display,
    cookware_should_be_listed, cookware_display_name, Content, Step, quantity_display, GroupedIndexAndQuantity
} from "./cooklang_wasm.js";

export {version, Parser};
export type {ScaledRecipeWithReport} from "./cooklang_wasm.js";


export class CooklangRecipe {
    // Metadata
    title?: string;
    description?: string;
    tags: Set<string>;
    author?: NameAndUrl;
    source?: NameAndUrl;
    course: any;
    time?: RecipeTime;
    servings?: Servings;
    difficulty: any;
    cuisine: any;
    diet: any;
    images: any;
    locale?: [string, string | null];
    custom_metadata: Map<any, any>;

    // Data
    rawMetadata: Map<any, any>;
    sections: Section[];
    ingredients: Ingredient[];
    cookware: Cookware[];
    timers: Timer[];
    inlineQuantities: Quantity[];

    // Preprocessed
    groupedIngredients: [Ingredient, GroupedQuantity][];
    groupedCookware: [Cookware, GroupedQuantity][];

    constructor(raw: ScaledRecipeWithReport,
                groupedIngredients: GroupedIndexAndQuantity[],
                groupedCookware: GroupedIndexAndQuantity[]) {
        this.title = raw.metadata.title;
        this.description = raw.metadata.description;
        this.tags = new Set(raw.metadata.tags);
        this.author = raw.metadata.author;
        this.source = raw.metadata.source;
        this.course = raw.metadata.course;
        this.time = raw.metadata.time;
        this.servings = raw.metadata.servings;
        this.difficulty = raw.metadata.difficulty;
        this.cuisine = raw.metadata.cuisine;
        this.diet = raw.metadata.diet;
        this.images = raw.metadata.images;
        this.locale = raw.metadata.locale;

        this.custom_metadata = new Map();
        for (let key in raw.metadata.custom)
            this.custom_metadata.set(key, raw.metadata.custom[key]);

        this.rawMetadata = new Map();
        for (let key in raw.recipe.raw_metadata.map)
            this.rawMetadata.set(key, raw.recipe.raw_metadata.map[key]);

        this.sections = raw.recipe.sections;
        this.ingredients = raw.recipe.ingredients;
        this.cookware = raw.recipe.cookware;
        this.timers = raw.recipe.timers;
        this.inlineQuantities = raw.recipe.inline_quantities;

        this.groupedIngredients = groupedIngredients.map((iaq) => [this.ingredients[iaq.index], iaq.quantity]);
        this.groupedCookware = groupedCookware.map((iaq) => [this.cookware[iaq.index], iaq.quantity]);
    }
}

export class CooklangParser {
    private parser: Parser;

    constructor() {
        this.parser = new Parser();
    }

    parse(input: string, scale?: number | null): [CooklangRecipe, string] {
        let raw = this.parser.parse(input, scale);
        return [new CooklangRecipe(raw, this.parser.group_ingredients(raw), this.parser.group_cookware(raw)), raw.report];
    }

    set units(value: boolean) {
        this.parser.load_units = value;
    }

    get units(): boolean {
        return this.parser.load_units
    }

    set extensions(value: number) {
        this.parser.extensions = value;
    }

    get extensions(): number {
        return this.parser.extensions
    }
}

export class HTMLRenderer {
    protected result!: string;
    protected recipe!: CooklangRecipe;

    render(recipe: CooklangRecipe): string {
        this.result = "";
        this.recipe = recipe;

        const groupedIngredients = recipe.groupedIngredients;
        const groupedCookware = recipe.groupedCookware;

        this.renderMetadata(recipe.rawMetadata);
        this.renderGroupedIngredients(groupedIngredients);
        this.renderGroupedCookwares(groupedCookware);

        if (groupedCookware.length > 0 || groupedIngredients.length > 0) {
            this.result += `<hr>`;
        }

        this.renderSections(recipe.sections);

        return this.result;
    }

    protected renderMetadata(metadata: Map<any, any>) {
        if (metadata.size > 0) {
            this.result += "<ul>";

            for (const [key, value] of metadata)
                this.renderMetadatum(key, value);

            this.result += "</ul>";
            this.result += "<hr>";
        }
    }

    protected renderMetadatum(key: any, value: any) {
        this.result += "<li class='metadata'>";
        this.result += `<span class='key'>${key}</span>: <span class='value'>${value}</span>`;
        this.result += "</li>";
    }

    protected renderGroupedIngredients(ingredients: [Ingredient, GroupedQuantity][]) {
        if (ingredients.length > 0) {
            this.result += "<h2>Ingredients:</h2>";
            this.result += "<ul>";

            for (const [ingredient, quantity] of ingredients) {
                this.renderGroupedIngredientHelper(ingredient, quantity);
            }

            this.result += "</ul>";
        }
    }

    protected renderGroupedIngredientHelper(ingredient: Ingredient, quantity: GroupedQuantity) {
        if (ingredient_should_be_listed(ingredient)) {
            const ingredientName = ingredient_display_name(ingredient);

            const quantityString = !grouped_quantity_is_empty(quantity) ?
                grouped_quantity_display(quantity)
                : null;

            this.renderGroupedIngredient(ingredientName, quantityString, ingredient.note);
        }
    }

    protected renderGroupedIngredient(name: string, quantity: string | null, note: string | null) {
        this.result += "<li>";
        this.result += `<b>${name}</b>`;

        if (quantity)
            this.result += `: ${quantity}`;

        if (note)
            this.result += ` (${note})`;

        this.result += "</li>";
    }

    protected renderGroupedCookwares(cookwares: [Cookware, GroupedQuantity][]) {
        if (cookwares.length > 0) {
            this.result += "<h2>Cookware:</h2>";
            this.result += "<ul>";

            for (const [cookware, quantity] of cookwares) {
                this.renderGroupedCookwareHelper(cookware, quantity);
            }

            this.result += "</ul>";
        }
    }

    protected renderGroupedCookwareHelper(cookware: Cookware, quantity: GroupedQuantity) {
        if (cookware_should_be_listed(cookware)) {
            const cookwareName = cookware_display_name(cookware);

            const quantityString = !grouped_quantity_is_empty(quantity) ?
                grouped_quantity_display(quantity)
                : null;

            this.renderGroupedCookware(cookwareName, quantityString, cookware.note);
        }
    }

    protected renderGroupedCookware(name: string, quantity: string | null, note: string | null) {
        this.result += "<li>";
        this.result += `<b>${name}</b>`;

        if (quantity)
            this.result += `: ${quantity}`;

        if (note)
            this.result += ` (${note})`;

        this.result += "</li>";
    }

    protected renderSections(sections: Section[]) {
        for (let s_index = 0; s_index < sections.length; s_index++) {
            const section = sections[s_index];
            const s_num = s_index + 1;

            if (section.name) {
                this.result += `<h3>(${s_num}) ${section.name}</h3>`;
            } else if (sections.length > 1) {
                this.result += `<h3>Section ${s_num}</h3>`;
            }

            for (const content of section.content) {
                this.renderContent(section, content);
            }
        }
    }

    protected renderContent(current_section: Section, content: Content) {
        switch (content.type) {
            case "text":
                this.result += `<p>${content.value}</p>>`;
                break;
            case "step":
                this.renderStep(current_section, content.value);
                break;
        }
    }

    protected renderStep(current_section: Section, step: Step) {
        this.result += `<p><b>${step.number}. </b>`;
        for (const item of step.items) {
            switch (item.type) {
                case "text":
                    this.result += item.value;
                    break
                case "ingredient":
                    this.renderInlineIngredient(current_section, this.recipe.ingredients[item.index]);
                    break;
                case "timer":
                    this.renderInlineTimer(this.recipe.timers[item.index]);
                    break;
                case "inlineQuantity":
                    this.renderInlineQuantity(this.recipe.inlineQuantities[item.index]);
                    break;
                case "cookware":
                    this.renderInlineCookware(this.recipe.cookware[item.index]);
                    break;
            }
        }
        this.result += "</p>";
    }

    protected renderInlineIngredient(current_section: Section, ingredient: Ingredient) {
        this.result += "<span class='ingredient'>";

        this.result += ingredient_display_name(ingredient);

        if (ingredient.quantity) {
            this.result += `<i>(${quantity_display(ingredient.quantity)})</i>`;
        }
        if (ingredient.relation.relation.type === "reference") {
            const index = ingredient.relation.relation.references_to;
            switch (ingredient.relation.reference_target) {
                case "ingredient":
                    break;
                case "step":
                    if (current_section.content[index].type === "step") {
                        `<i>(from step ${current_section.content[index].value.number})</i>`
                    }
                    break;
                case "section":
                    const sect = index + 1;
                    `<i>(from section ${sect})</i>`
                    break;
            }
        }


        this.result += "</span>";
    }

    protected renderInlineTimer(timer: Timer) {
        this.result += "<span class='timer'>";

        if (timer.name) {
            this.result += `(${timer.name})`;
        }
        if (timer.quantity) {
            this.result += `<i>${quantity_display(timer.quantity)}</i>`;
        }

        this.result += "</span>";
    }

    private renderInlineQuantity(quantity: Quantity) {
        this.result += `<i class="temp">(${quantity_display(quantity)})</i>`;
    }

    private renderInlineCookware(cookware: Cookware) {
        this.result += "<span class='cookware'>";

        this.result += cookware_display_name(cookware);

        if (cookware.quantity) {
            this.result += `<i>(${quantity_display(cookware.quantity)})</i>`;
        }

        this.result += "</span>";
    }
}