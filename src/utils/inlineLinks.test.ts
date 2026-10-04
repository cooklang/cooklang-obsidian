import { describe, expect, it } from "vitest";
import { splitInlineLinks } from "./inlineLinks";

describe("splitInlineLinks", () => {
    it("leaves plain text alone", () => {
        expect(splitInlineLinks("Serve hot.")).toEqual([{ type: "text", value: "Serve hot." }]);
    });

    it("splits wiki links with an alias", () => {
        expect(splitInlineLinks("Finish [[Sous vide steak|the steak]] and rest.")).toEqual([
            { type: "text", value: "Finish " },
            { type: "wiki", linktext: "Sous vide steak", label: "the steak" },
            { type: "text", value: " and rest." },
        ]);
    });

    it("keeps a heading in the link text", () => {
        expect(splitInlineLinks("See [[Sauce#Finish]].")).toEqual([
            { type: "text", value: "See " },
            { type: "wiki", linktext: "Sauce#Finish", label: "Sauce#Finish" },
            { type: "text", value: "." },
        ]);
    });

    it("splits markdown web links", () => {
        expect(splitInlineLinks("From [King Arthur](https://example.com/pancakes).")).toEqual([
            { type: "text", value: "From " },
            { type: "url", label: "King Arthur", href: "https://example.com/pancakes" },
            { type: "text", value: "." },
        ]);
    });
});
