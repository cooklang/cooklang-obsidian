// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("cook", function() {
  return {
    token: function(stream, state) {
      var sol = stream.sol() || state.afterSection;
      var eol = stream.eol();

      state.afterSection = false;

      if (sol) {
        if (state.nextMultiline) {
          state.inMultiline = true;
          state.nextMultiline = false;
        } else {
          state.position = null;
        }
      }

      if (eol && ! state.nextMultiline) {
        state.inMultiline = false;
        state.position = null;
      }

      if (sol) {
        while(stream.eatSpace()) {}
      }

      var ch = stream.next();


      if (sol && ch === ">") {
        if (stream.eat(">")) {
          state.position = "metadata-key"
          return "metadata"
        }
      }
      if(state.position === "metadata"){
      }
      else if(state.position === "metadata-key") {
        if(ch === ':') state.position = "metadata"
      }
      else {
        if (ch === "-") {
          if (stream.eat("-")) {
            stream.skipToEnd();
            return "comment";
          }
        }

        if (stream.match(/\[-.+?-\]/))
          return "comment";

        if(stream.match(/^@([^@#~]+?(?={))/))
          return "ingredient";
        else if(stream.match(/^@(.+?\b)/))
          return "ingredient";

        if(stream.match(/^#([^@#~]+?(?={))/))
          return "cookware";
        else if(stream.match(/^#(.+?\b)/))
          return "cookware";

        if(ch === '~'){
          state.position = "timer";
          return "formatting";
        }
        if(ch === '{'){
          if(state.position != "timer") state.position = "measurement"
          return "formatting";
        }
        if(ch === '}'){
          state.position = null;
          return "formatting";
        }
        if(ch === '%' && (state.position === "measurement" || state.position === "timer")){
          state.position = "unit";
          return "formatting";
        }
      }

      return state.position;
    },

    startState: function() {
      return {
        formatting : false,
        nextMultiline : false,  // Is the next line multiline value
        inMultiline : false,    // Is the current line a multiline value
        afterSection : false    // Did we just open a section
      };
    }

  };
});

CodeMirror.defineMIME("text/x-cook", "cook");
CodeMirror.defineMIME("text/x-cooklang", "cook");

});
