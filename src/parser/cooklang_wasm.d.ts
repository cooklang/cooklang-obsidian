/* tslint:disable */
/* eslint-disable */
export function quantity_display(_this: Quantity): string;
export function cookware_should_be_listed(_this: Cookware): boolean;
export function ingredient_display_name(_this: Ingredient): string;
export function ingredient_should_be_listed(_this: Ingredient): boolean;
export function version(): string;
export function grouped_quantity_is_empty(_this: GroupedQuantity): boolean;
export function grouped_quantity_display(_this: GroupedQuantity): string;
export function cookware_display_name(_this: Cookware): string;
export interface InterpretedMetadata {
    title?: string;
    description?: string;
    tags?: string[];
    author?: NameAndUrl;
    source?: NameAndUrl;
    course?: any;
    time?: RecipeTime;
    servings?: Servings;
    difficulty?: any;
    cuisine?: any;
    diet?: any;
    images?: any;
    locale?: [string, string | null];
    custom: Record<any, any>;
}

export interface ScaledRecipeWithReport {
    recipe: Recipe;
    metadata: InterpretedMetadata;
    report: string;
}

export interface GroupedIndexAndQuantity {
    index: number;
    quantity: GroupedQuantity;
}

export interface RecipeReference {
    name: string;
    components: string[];
}

/**
 * A recipe timer
 *
 * If created from parsing, at least one of the fields is guaranteed to be
 * [`Some`].
 */
export interface Timer {
    /**
     * Name
     */
    name: string | null;
    /**
     * Time quantity
     *
     * If created from parsing the following applies:
     *
     * - If the [`ADVANCED_UNITS`](crate::Extensions::ADVANCED_UNITS) extension
     *   is enabled, this is guaranteed to have a time unit and a non text value.
     *
     * - If the [`TIMER_REQUIRES_TIME`](crate::Extensions::TIMER_REQUIRES_TIME)
     *   extension is enabled, this is guaranteed to be [`Some`].
     */
    quantity: Quantity | null;
}

/**
 * Relation between components
 */
export type ComponentRelation = { type: "definition"; referenced_from: number[]; defined_in_step: boolean } | { type: "reference"; references_to: number };

/**
 * A step item
 *
 * Except for [`Item::Text`], the value is the index where the item is located
 * in it\'s corresponding [`Vec`] in the [`Recipe`].
 */
export type Item = { type: "text"; value: string } | { type: "ingredient"; index: number } | { type: "cookware"; index: number } | { type: "timer"; index: number } | { type: "inlineQuantity"; index: number };

/**
 * A complete recipe
 *
 * The recipes do not have a name. You give it externally or maybe use
 * some metadata key.
 *
 * The recipe returned from parsing is a [`ScalableRecipe`].
 *
 * The difference between [`ScalableRecipe`] and [`ScaledRecipe`] is in the
 * values of the quantities of ingredients, cookware and timers. The parser
 * returns [`ScalableValue`]s and after scaling, these are converted to regular
 * [`Value`]s.
 */
export interface Recipe {
    /**
     * Metadata as read from preamble
     */
    raw_metadata: Metadata;
    /**
     * Each of the sections
     *
     * If no sections declared, a section without name
     * is the default.
     */
    sections: Section[];
    /**
     * All the ingredients
     */
    ingredients: Ingredient[];
    /**
     * All the cookware
     */
    cookware: Cookware[];
    /**
     * All the timers
     */
    timers: Timer[];
    /**
     * All the inline quantities
     */
    inline_quantities: Quantity[];
}

/**
 * A step holding step [`Item`]s
 */
export interface Step {
    /**
     * [`Item`]s inside
     */
    items: Item[];
    /**
     * Step number
     *
     * The step numbers start at 1 in each section and increase with non
     * text step.
     */
    number: number;
}

/**
 * Same as [`ComponentRelation`] but with the ability to reference steps and
 * sections apart from other ingredients.
 */
export interface IngredientRelation {
    relation: ComponentRelation;
    reference_target: IngredientReferenceTarget | null;
}

/**
 * A section holding steps
 */
export interface Section {
    /**
     * Name of the section
     */
    name: string | null;
    /**
     * Content inside
     */
    content: Content[];
}

/**
 * A recipe cookware item
 */
export interface Cookware {
    /**
     * Name
     */
    name: string;
    /**
     * Alias
     */
    alias: string | null;
    /**
     * Amount needed
     *
     * Note that this is a value, not a quantity, so it doesn\'t have units.
     */
    quantity: Quantity | null;
    /**
     * Note
     */
    note: string | null;
    /**
     * How the cookware is related to others
     */
    relation: ComponentRelation;
}

/**
 * Each type of content inside a section
 */
export type Content = { type: "step"; value: Step } | { type: "text"; value: string };

/**
 * Target an ingredient reference references to
 *
 * This is obtained from [`IngredientRelation::references_to`]
 */
export type IngredientReferenceTarget = "ingredient" | "step" | "section";

/**
 * A recipe ingredient
 */
export interface Ingredient {
    /**
     * Name
     *
     * This can have the form of a path if the ingredient references a recipe.
     */
    name: string;
    /**
     * Alias
     */
    alias: string | null;
    /**
     * Quantity
     */
    quantity: Quantity | null;
    /**
     * Note
     */
    note: string | null;
    /**
     * Recipe reference
     */
    reference: RecipeReference | null;
    /**
     * How the cookware is related to others
     */
    relation: IngredientRelation;
}

/**
 * Group of quantities
 *
 * This support efficient adding of new quantities, merging other groups..
 *
 * This is used to create, and merge ingredients lists.
 *
 * This can return many quantities to avoid loosing information when not all
 * quantities are compatible. If a single total can be calculated, it will be
 * single quantity. If the total cannot be calculated because 2 or more units
 * can\'t be added, it contains all the quantities added where possible.
 *
 * The display impl is a comma separated list of all the quantities.
 */
export interface GroupedQuantity {
    /**
     * known units
     */
    known: EnumMap<PhysicalQuantity, Quantity | null>;
    /**
     * unknown units
     */
    unknown: Record<string, Quantity>;
    /**
     * no units
     */
    no_unit: Quantity | null;
    /**
     * could not operate/add to others
     */
    other: Quantity[];
}

/**
 * A quantity used in components
 */
export interface Quantity {
    value: Value;
    unit: string | null;
    scalable: boolean;
}

/**
 * Base value
 */
export type Value = { type: "number"; value: Number } | { type: "range"; value: { start: Number; end: Number } } | { type: "text"; value: string };

/**
 * Error type for scaling operations
 */
export type ScaleError = "InvalidServings" | "InvalidYield" | { UnitMismatch: { expected: string; got: string } };

/**
 * Metadata of a recipe
 *
 * You can use [`Metadata::get`] to get a value. The key can be a `&str`, a
 * [`StdKey`] or any [yaml value](serde_yaml::Value). Once you get a
 * [`serde_yaml::Value`], you can use any of it\'s methods to get your desired
 * type, or any of the [`CooklangValueExt`] which adds more ways to interpret
 * it.
 *
 * Many other methods on this struct are a way to access [`StdKey`] with their
 * _expected_ type. If these methods return `None` it can be because the key
 * was not present or the value was not of the expected type. You can also
 * decide to not use them and extract the metadata you prefer.
 */
export interface Metadata {
    /**
     * All the raw key/value pairs from the recipe
     */
    map: Record<any, any>;
}

/**
 * Combination of name and URL.
 *
 * At least one of the fields is [`Some`].
 */
export interface NameAndUrl {
    name?: string;
    url?: string;
}

/**
 * Servings information that can be numeric or a string
 */
export type Servings = number | string;

/**
 * Time that takes to prep/cook a recipe
 *
 * All values are in minutes.
 */
export type RecipeTime = number | { prep_time?: number; cook_time?: number };

export class FallibleResult {
  private constructor();
  free(): void;
  value: string;
  error: string;
}
export class Parser {
  free(): void;
  parse_full(input: string, json: boolean): FallibleResult;
  parse_events(input: string): string;
  parse_render(input: string, scale?: number | null): FallibleResult;
  std_metadata(input: string): FallibleResult;
  /**
   * returns vector of indices in r.recipe.cookware and their quantities
   */
  group_cookware(r: ScaledRecipeWithReport): GroupedIndexAndQuantity[];
  /**
   * returns vector of indices in r.recipe.ingredients and their quantities
   */
  group_ingredients(r: ScaledRecipeWithReport): GroupedIndexAndQuantity[];
  constructor();
  parse(input: string, scale?: number | null): ScaledRecipeWithReport;
  parse_ast(input: string, json: boolean): FallibleResult;
  extensions: number;
  load_units: boolean;
}
