import { TFile } from 'obsidian';

// utility class for parsing cooklang files
export class CookLang {
  static parse(source:string) {

    const recipe = new Recipe();

    source.split('\n').forEach(line => {

      let match:RegExpExecArray;
      // skip blank lines
      if(line.trim().length === 0) return;
      // metadata lines
      else if(match = Metadata.regex.exec(line)){
        recipe.metadata.push(new Metadata(match[0]));
      }
      // method lines
      else {
        // clear comments
        line = line.replace(/\/\/.*/, '');
        if(line.trim().length === 0) return;

        // ingredients on a line
        while(match = Ingredient.regex.exec(line)){
          const ingredient = new Ingredient(match[0]);
          recipe.ingredients.push(ingredient);
          line = line.replace(match[0], ingredient.methodOutput());
        }

        // cookware on a line
        while(match = Cookware.regex.exec(line)){
          const c = new Cookware(match[0]);
          recipe.cookware.push(c);
          line = line.replace(match[0], c.methodOutput());
        }

        // timers on a line
        while(match = Timer.regex.exec(line)){
          const t = new Timer(match[0]);
          recipe.timers.push(t);
          line = line.replace(match[0], t.methodOutput());
        }

        // add in the method line
        recipe.method.push(line.trim());
      }
    });

    return recipe;
  }
}

// a class representing a recipe
export class Recipe {
  metadata: Metadata[] = [];
  ingredients: Ingredient[] = [];
  cookware: Cookware[] = [];
  timers: Timer[] = [];
  method: string[] = [];
  image: TFile;
  methodImages: Map<Number, TFile> = new Map<Number, TFile>();

  calculateTotalTime() {
    let time = 0;
    this.timers.forEach(timer => {
      let amount:number = 0;
      if(parseFloat(timer.amount) + '' == timer.amount) amount = parseFloat(timer.amount);
      else if(timer.amount.contains('/')){
        const split = timer.amount.split('/');
        if(split.length == 2){
          const num = parseFloat(split[0]);
          const den = parseFloat(split[1]);
          if(num && den){
            amount = num / den;
          }
        }
      }

      if(amount > 0){
        if(timer.unit.toLowerCase().startsWith('s')){
          time += amount;
        }
        else if(timer.unit.toLowerCase().startsWith('m')) {
          time += amount * 60;
        }
        else if(timer.unit.toLowerCase().startsWith('h')) {
          time += amount * 60 * 60;
        }
      }
    });
    return time;
  }
}

// a class representing an ingredient
export class Ingredient {
  // starts with an @, ends at a word boundary or {}
  // (also capture what's inside the {})
  static regex = /@(?:([^@#~]+?)(?:{(.*?)}|{}))|@(.+?\b)/;
  constructor(s: string) {
    this.originalString = s;
    const match = Ingredient.regex.exec(s);
    this.name = match[1] || match[3];
    const attrs = match[2]?.split('%');
    this.amount = attrs && attrs.length > 0 ? attrs[0] : null;
    this.unit = attrs && attrs.length > 1 ? attrs[1] : null;
  }
  originalString: string = null;
  name: string = null;
  amount: string = null;
  unit: string = null;

  methodOutput = () => {
    let s = `<span class='ingredient'>`;
    if (this.amount !== null) {
      s += `<span class='amount'>${this.amount} </span>`;
    }
    if (this.unit !== null) {
      s += `<span class='unit'>${this.unit} </span>`;
    }

    s += `${this.name}</span>`;
    return s;
  }
  listOutput = () => {
    let s = ``;
    if (this.amount !== null) {
      s += `<span class='amount'>${this.amount}</span> `;
    }
    if (this.unit !== null) {
      s += `<span class='unit'>${this.unit}</span> `;
    }

    s += this.name;
    return s;
  }
}

// a class representing an item of cookware
export class Cookware {
  // starts with a #, ends at a word boundary or {}
  static regex = /#(?:([^@#~]+?)(?:{}))|#(.+?\b)/;
  originalString: string = null;
  name: string = null;

  constructor(s: string) {
    this.originalString = s;
    const match = Cookware.regex.exec(s);
    this.name = match[1] || match[2];
  }

  methodOutput = () => {
    return `<span class='cookware'>${this.name}</span>`;
  }
  listOutput = () => {
    return this.name;
  }
}

// a class representing a timer
export class Timer {
  // contained within ~{}
  static regex = /~{([0-9]+)%(.+?)}/;
  originalString: string = null;
  amount: string = null;
  unit: string = null;

  constructor(s: string) {
    const match = Timer.regex.exec(s);
    this.amount = match[1];
    this.unit = match[2];
  }

  methodOutput = () => {
    return `<span class='time'><span class='time-amount'>${this.amount}</span> <span class='time-unit'>${this.unit}</span></span>`;
  }
  listOutput = () => {
    return `<span class='time-amount'>${this.amount}</span> <span class='time-unit'>${this.unit}</span>`;
  }
}

// a class representing metadata item
export class Metadata {
  // starts with >>
  static regex = />>\s*(.*?):\s*(.*)/;
  originalString: string = null;
  key: string = null;
  value: string = null;

  constructor(s: string) {
    const match = Metadata.regex.exec(s);
    this.key = match[1].trim();
    this.value = match[2].trim();
  }

  methodOutput = () => {
    return `<span class='metadata metadata-key'>${this.key}</span> <span class='metadata metadata-value'>${this.value}</span>`;
  }
  listOutput = () => {
    return `<span class='metadata-key'>${this.key}</span> <span class='metadata-value'>${this.value}</span>`;
  }
}