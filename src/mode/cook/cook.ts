import { StreamLanguage } from "@codemirror/language"

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
      inNote: false,         // Track if we're in a note
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
      state.inNote = true;
      return "comment";
    }

    if (state.inNote) {
      stream.skipToEnd();
      return "comment";
    }

    // Handle ingredients (@ingredient{amount})
    if (stream.match(/^@([^@#~]+?(?={))/)) {
      return "variable";
    } else if (stream.match(/^@(.+?\b)/)) {
      return "variable";
    }

    // Handle cookware (#cookware{amount})
    if (stream.match(/^#([^@#~]+?(?={))/)) {
      return "keyword";
    } else if (stream.match(/^#(.+?\b)/)) {
      return "keyword";
    }

    // Handle timers (~timer{amount})
    if (stream.match(/^~([^@#~]+?(?={))/)) {
      return "number";
    } else if (stream.match(/^~(.+?\b)/)) {
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
