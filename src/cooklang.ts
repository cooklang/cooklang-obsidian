export namespace cooklang {
  const COMMENT_REGEX = /(--.*)|(\[-(.|\n)+?-\])/g
  const INGREDIENT_REGEX = /@(?:([^@#~]+?)(?:{(.*?)}|{}))|@(.+?\b)/
  const COOKWARE_REGEX = /#(?:([^@#~]+?)(?:{}))|#(.+?\b)/
  const TIMER_REGEX = /~{([0-9]+(?:\/[0-9]+)?)%(.+?)}/
  const METADATA_REGEX = /^>>\s*(.*?):\s*(.*)$/

  // a base class containing the raw string
  export class base {
    raw: string

    constructor(s: string | string[]) {
      if (s instanceof Array) this.raw = s[0];
      else this.raw = s
    }
  }

  // ingredients
  export class ingredient extends base {
    name: string
    amount: string
    unit: string

    constructor(s: string | string[]) {
      super(s)
      const match = s instanceof Array ? s : INGREDIENT_REGEX.exec(s)
      if (!match || match.length != 4) throw `error parsing ingredient: '${s}'`
      this.name = (match[1] || match[3]).trim()
      const attrs = match[2]?.split('%')
      this.amount = attrs && attrs.length > 0 ? attrs[0].trim() : null
      this.unit = attrs && attrs.length > 1 ? attrs[1].trim() : null
    }
  }

  // cookware
  export class cookware extends base {
    name: string

    constructor(s: string | string[]) {
      super(s)
      const match = s instanceof Array ? s : COOKWARE_REGEX.exec(s)
      if (!match || match.length != 3) throw `error parsing cookware: '${s}'`
      this.name = (match[1] || match[2]).trim()
    }
  }

  // timer
  export class timer extends base {
    amount: string
    unit: string
    seconds: number

    constructor(s: string | string[]) {
      super(s)
      const match = s instanceof Array ? s : TIMER_REGEX.exec(s)
      if (!match || match.length != 3) throw `error parsing timer: '${s}'`
      this.amount = match[1].trim()
      this.unit = match[2].trim()
      this.seconds = timer.parseTime(this.amount, this.unit);
    }

    static parseTime(s: string, unit: string = 'm') {
      let time = 0;
      let amount: number = 0;
      if (parseFloat(s) + '' == s) amount = parseFloat(s);
      else if (s.includes('/')) {
        const split = s.split('/');
        if (split.length == 2) {
          const num = parseFloat(split[0]);
          const den = parseFloat(split[1]);
          if (num + '' == split[0] && den + '' == split[1]) {
            amount = num / den;
          }
        }
      }

      if (amount > 0) {
        if (unit.toLowerCase().startsWith('s')) {
          time = amount;
        }
        else if (unit.toLowerCase().startsWith('m')) {
          time = amount * 60;
        }
        else if (unit.toLowerCase().startsWith('h')) {
          time = amount * 60 * 60;
        }
      }

      return time;
    }
  }

  // metadata
  export class metadata extends base {
    key: string
    value: string

    constructor(s: string | string[]) {
      super(s)
      const match = s instanceof Array ? s : METADATA_REGEX.exec(s)
      if (!match || match.length != 3) throw `error parsing metadata: '${s}'`
      this.key = match[1].trim()
      this.value = match[2].trim()
    }
  }

  // a single recipe step
  export class step extends base {
    line: (string | base)[] = []
    image?: any

    constructor(s: string) {
      super(s)
      this.line = this.parseLine(s)
    }

    // parse a single line
    parseLine(s: string): (string | base)[] {
      let match: string[]
      let b: base
      let line: (string | base)[] = []
      // if the line is blank, return an empty line
      if (s.trim().length === 0) return []
      // if it's a metadata line, return that
      else if (match = METADATA_REGEX.exec(s)) {
        return [new metadata(match)]
      }
      // if it has an ingredient, pull that out
      else if (match = INGREDIENT_REGEX.exec(s)) {
        b = new ingredient(match)
      }
      // if it has an item of cookware, pull that out
      else if (match = COOKWARE_REGEX.exec(s)) {
        b = new cookware(match)
      }
      // if it has a timer, pull that out
      else if (match = TIMER_REGEX.exec(s)) {
        b = new timer(match)
      }

      // if we found something (ingredient, cookware, timer)
      if (b) {
        // split the string up to get the string left and right of what we found
        const split = s.split(b.raw)
        // if the line doesn't start with what we matched, we need to parse the left side
        if (!s.startsWith(b.raw)) line.unshift(...this.parseLine(split[0]))
        // add what we matched in the middle
        line.push(b)
        // if the line doesn't end with what we matched, we need to parse the right side
        if (!s.endsWith(b.raw)) line.push(...this.parseLine(split[1]))

        return line
      }
      // if it doesn't match any regular expressions, just return the whole string
      return [s]
    }
  }

  export class recipe extends base {
    metadata: metadata[] = []
    ingredients: ingredient[] = []
    cookware: cookware[] = []
    timers: timer[] = []
    steps: step[] = []
    image?: any

    constructor(s?: string) {
      super(s)
      s?.replace(COMMENT_REGEX, '')?.split('\n')?.forEach(line => {
        let l = new step(line);
        if (l.line.length != 0) {
          if (l.line.length == 1 && l.line[0] instanceof metadata) {
            this.metadata.push(l.line[0])
          }
          else {
            l.line.forEach(b => {
              if (b instanceof ingredient) this.ingredients.push(b)
              else if (b instanceof cookware) this.cookware.push(b)
              else if (b instanceof timer) this.timers.push(b)
            })
            this.steps.push(l);
          }
        }
      })
    }

    calculateTotalTime() {
      return this.timers.reduce((a,b) => a + b.seconds, 0)
    }
  }
}