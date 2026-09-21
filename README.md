# Cooklang Editor Obsidian Plugin
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/deathau/cooklang-obsidian?style=for-the-badge&sort=semver)](https://github.com/cooklang/cooklang-obsidian/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/cooklang/cooklang-obsidian/total?style=for-the-badge)

A plugin for [Obsidian](https://obsidian.md) adding support for [Cooklang](https://cooklang.org)

![Screenshot](https://github.com/cooklang/cooklang-obsidian/raw/main/screenshot.png)

> Looking for maintainers, reach out dubadub on Discor server.

## Installation
- This plugin has been submitted community plugins repo. You can install it from Communinty Plugins within Obsidian.
- You can build and install the plugin manually with Node.js 24 LTS and npm 11 by checking out the files to `<your vault>/.obsidian/plugins/cooklang-obsidian`, then running `npm ci` and `npm run build`.

## Rich preview

Opening a recipe in Preview shows a single rich recipe page:

- **Hero** with the recipe title, description, **title image** (a sibling file named like
  the recipe, e.g. `Curry.jpg`, or the first URL in `image`/`images` metadata), and meta
  pills for total time, servings, difficulty, source and tags. Metadata image URLs are
  loaded from their remote hosts when the preview is open and images are enabled.
- **Servings scaler** — a `− N servings +` control in the sticky bar that rescales every
  ingredient quantity (and inline quantities in the steps) in real time.
- **Two-column layout** on wide panes: a sticky ingredient checklist beside the steps; it
  stacks into a single column on narrow panes and mobile.
- **Cooklang sections** (`= Section =`) group both the ingredients and the steps, and
  `> notes` render as callouts.
- **Per-step images** following the [Cooklang convention](https://cooklang.org/docs/spec/#adding-pictures)
  (`Recipe.1.jpg` for the first step, `Recipe.2.jpg` for the second, …).
- **Step tracking** — tap a step to mark it current and dim completed steps.

Each of these can be toggled in the plugin settings (Servings scaler, Two-column layout,
Step tracking), falling back to a simple stacked list.

## Markdown recipes

Recipes can be stored in three formats:

| Format | Recognition |
| --- | --- |
| `Dinner.cook` | Standard Cooklang file; the default for new recipes. |
| `Dinner.cook.md` | Recognized by its filename, even without properties. |
| `Dinner.md` | Requires the Boolean YAML property `recipe: true` (not the string `"true"`). |

Both Markdown formats contain YAML properties followed by a raw Cooklang body:

```text
---
recipe: true
title: Simple rice
servings: 2
tags:
  - dinner
---

Simmer @rice{200%g} in @water{400%ml} in a #pot for ~{15%min}.
```

All recipe formats use Obsidian's native editor with Cooklang syntax colors.
Recipes use **Source mode**, retaining Obsidian's editing commands, search,
spellcheck, Vim mode, and editor extensions. Line wrapping and editor layout follow
Obsidian; there is no separate Cooklang line-wrap setting. Ordinary Markdown notes
are unaffected unless their frontmatter contains the Boolean `recipe: true`.

**Default view** chooses the native editor or interactive recipe preview for newly
opened recipes. Use Obsidian's Reading View action, **Toggle preview recipe**, or
**Open as Recipe** to enter recipe preview; **Edit recipe source** returns to the
native editor. Choosing source stays active in that tab until you navigate elsewhere.
The old **Edit as Markdown** command keeps its command ID, so existing hotkeys work.

Scaling, step position, checked ingredients, and running timers survive switching
between source and preview in the same tab. Tabs have independent recipe sessions;
navigating to another file or closing a tab clears its session and stops its timers.
Preview tabs retain scale and step position across restarts; tabs saved in source
mode do not persist recipe session state. Cooklang colors also update immediately
when you edit a Markdown recipe's `recipe` property.

Native editing does not make `.cook` files participate in every Markdown-only
Obsidian feature, such as Markdown metadata indexing. Choose a Markdown recipe
format for the fullest integration. Cooklang highlighting inside fenced blocks
is not added by this change; their compact rendered output stays the same.

Choose **New recipe format** in the plugin settings to change the format used by
both creation commands and the folder menu. The default remains `.cook`; newly
created Markdown recipes include `recipe: true`.

Use **Convert recipe file format** to convert the current recipe in place to any of
the other formats. An unmarked Markdown file can first be opened with **Open as
Recipe**. Conversion preserves the Cooklang body and metadata values, adds
`recipe: true` for Markdown, and uses Obsidian's rename API to update links according
to your vault preferences. YAML formatting/comments may change when adding the
property. Existing destinations are never overwritten. No recipes are migrated
automatically, and metadata is retained when converting back to `.cook`.

For `Dinner.cook.md`, sibling images remain `Dinner.jpg`, `Dinner.1.jpg`, etc.
Older `Dinner.cook.jpg` and `Dinner.cook.1.jpg` names are also accepted as fallbacks.
Conversion does not rename image files.

### Obsidian features and embeds

Because Markdown recipes are `.md` notes, Obsidian can index their text, properties,
tags, and ordinary Markdown links for search, graph, backlinks, and plugins such as
Dataview. Put queryable fields in YAML properties; legacy Cooklang `>>` metadata is
not converted into properties. Cooklang ingredient references are not Obsidian
backlinks. Raw Cooklang `#cookware` syntax can also be interpreted as Markdown tags.

For example, with Dataview installed, query newly created Markdown recipes using:

````markdown
```dataview
TABLE servings, tags
WHERE recipe = true
```
````

A filename-only `.cook.md` recipe needs the `recipe: true` property to match that
particular query.

Embed an entire recipe using `![[Dinner]]` or `![[Dinner.cook]]` for a `.cook.md`
note (use the actual note path when names overlap). The embed shows a linked title,
ingredients, and method, and updates when the recipe changes. It is read-only:
no images, live timers, scaling controls, or step tracking. Heading/block embeds
keep Obsidian's native behavior.

For mixed notes containing ordinary Markdown and Cooklang, use fenced `cook` or
`cooklang` blocks in an unmarked Markdown note. Those blocks keep their existing
compact rendering. Whole-file recipe mode expects a raw Cooklang body, not a
fenced recipe surrounded by Markdown. Native Markdown editing/reading outside an
embed remains available; it displays the raw Cooklang syntax.

## Recipe references

Reference another recipe with Cooklang ingredient syntax, for example
`@./Components/Beans`. References resolve relative to the root of the vault,
which acts as the Cooklang recipes root. The plugin opens a matching `.cook`
file first, following the Cooklang convention. A quantity such as `{2}` opens
the target at twice its base scale, `{4%servings}` targets four servings, and a
quantity matching the target's `yield` unit scales to that yield. If no `.cook`
file exists, the plugin tries a same-path `.md` file with the following Boolean
property, then a `.cook.md` file:

```yaml
---
recipe: true
---
```

This works in full recipe views, whole-note recipe embeds, and embedded
`cook`/`cooklang` blocks. Reference paths remain relative to the vault root.

## Security
> Third-party plugins can access files on your computer, connect to the internet, and even install additional programs.

The source code of this plugin is available on GitHub for you to audit yourself, but installing plugins into Obsidian is a matter of trust.

I can assure you here that I do nothing to collect your data, send information to the internet or otherwise do anything nefarious with your system. However, be aware that I *could*, and without auditing the code yourself, you only have my word that I don't.

# Roadmap
This is the stuff I would ideally like to include in this plugin that isn't available as yet:
- [x] Improve editor/preview mode buttons to be more like markdown
- [x] Command to convert `.md` to `.cook`
    - [x] `cook` / `cooklang` code block support
- [x] Include option for showing quantities inline in the method
    - [ ] Option to link between ingredients and method?
- [x] Include options for showing ingredients list, tools list and time
    - [x] (calculate total time)
- [ ] Unit conversion (metric <-> imperial)
- [x] Scaling up/down (check spec)
- [ ] Shopping list and `.conf` file support (needs designing)
- [ ] Better metadata support.
    - [x] Making source links clickable.
    - [ ] Support for Obsidian tagging.
- [ ] (Maybe, pending feedback) Markdown formatting support.

# Changelog

[View the complete changelog](https://github.com/cooklang/cooklang-obsidian/blob/main/CHANGELOG.md).
