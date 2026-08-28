import { StreamLanguage } from "@codemirror/language"
import { tagHighlighter, tags as t } from "@lezer/highlight"

export const cooklangHighlighter = tagHighlighter([
  {tag: t.variableName, class: "cook-token-ingredient"},
  {tag: t.keyword, class: "cook-token-cookware"},
  {tag: t.number, class: "cook-token-timer"},
  {tag: t.comment, class: "cook-token-comment"},
  {tag: t.meta, class: "cook-token-meta"},
  {tag: t.unit, class: "cook-token-unit"}
])

// Define the Cooklang language
export const cooklang = StreamLanguage.define({
  name: "cooklang",

  startState() {
    return {
      formatting: false,
      nextMultiline: false,  // Is the next line multiline value
      inMultiline: false,    // Is the current line a multiline value
      afterSection: false,   // Did we just open a section
      position: null as string | null,
      inFrontmatter: false,  // Track if we're in frontmatter
      inMetadata: false,     // Track if we're in metadata section
      inComment: false       // Track if we're in a comment
    };
  },

  token(stream, state) {
    const sol = stream.sol() || state.afterSection;
    const eol = stream.eol();

    state.afterSection = false;

    if (sol) {
      if (state.nextMultiline) {
        state.inMultiline = true;
        state.nextMultiline = false;
      } else {
        state.position = null;
      }
    }

    if (eol && !state.nextMultiline) {
      state.inMultiline = false;
      state.position = null;
    }

    if (sol) {
      while(stream.eatSpace()) {}
    }

    // Check for frontmatter delimiters
    if (sol && stream.match(/^---\s*$/)) {
      state.inFrontmatter = !state.inFrontmatter;
      return "meta";
    }

    // If we're in frontmatter, highlight the entire line
    if (state.inFrontmatter) {
      stream.skipToEnd();
      return "meta";
    }

    // Check for comments (-- comment)
    if (sol && stream.match(/^--/)) {
      stream.skipToEnd();
      return "comment";
    }

    // Check for block comments ([- comment -])
    if (stream.match(/^\[-/)) {
      state.inComment = true;
      return "comment";
    }

    if (state.inComment) {
      if (stream.match(/-]/)) {
        state.inComment = false;
        return "comment";
      }
      stream.skipToEnd();
      return "comment";
    }

    // Check for metadata (>> key: value)
    if (sol && stream.match(/^>>/)) {
      state.inMetadata = true;
      state.position = "metadata-key";
      return "meta";
    }

    // Handle metadata key and value
    if (state.inMetadata) {
      if (state.position === "metadata-key") {
        if (stream.match(/^[^:]+:/)) {
          state.position = "metadata-value";
          return "meta";
        }
        stream.skipToEnd();
        return "meta";
      } else if (state.position === "metadata-value") {
        stream.skipToEnd();
        return "meta";
      }
    }

    // Check for notes (lines starting with >)
    if (sol && stream.match(/^>/)) {
      stream.skipToEnd();
      return "comment";
    }

    // Single-word names (no braces) run up to the first non-letter/digit.
    // `\p{L}`/`\p{N}` with the `u` flag keep umlauts and accents highlighted,
    // where the old ASCII `\b` boundary stopped at the first non-ASCII letter
    // (e.g. `@Möhre` only highlighted `@M`). `\p{M}` covers combining accents.

    // Handle ingredients (@ingredient{amount})
    if (stream.match(/^@([^@#~]+?(?={))/)) {
      return "variable";
    } else if (stream.match(/^@([\p{L}\p{N}][\p{L}\p{N}\p{M}_]*)/u)) {
      return "variable";
    }

    // Handle cookware (#cookware{amount})
    if (stream.match(/^#([^@#~]+?(?={))/)) {
      return "keyword";
    } else if (stream.match(/^#([\p{L}\p{N}][\p{L}\p{N}\p{M}_]*)/u)) {
      return "keyword";
    }

    // Handle timers (~timer{amount})
    if (stream.match(/^~([^@#~]+?(?={))/)) {
      return "number";
    } else if (stream.match(/^~([\p{L}\p{N}][\p{L}\p{N}\p{M}_]*)/u)) {
      return "number";
    }

    // Handle amounts in curly braces
    const ch = stream.next();
    if (!ch) return null;

    if (ch === '{') {
      if (state.position !== "timer") state.position = "measurement";
      return null;
    }

    if (ch === '}') {
      state.position = null;
      return null;
    }

    if (ch === '%' && (state.position === "measurement" || state.position === "timer")) {
      state.position = "unit";
      return null;
    }

    return state.position;
  }
});
