# Cooklang Editor Obsidian Plugin
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/deathau/cooklang-obsidian?style=for-the-badge&sort=semver)](https://github.com/cooklang/cooklang-obsidian/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/cooklang/cooklang-obsidian/total?style=for-the-badge)

A plugin for [Obsidian](https://obsidian.md) adding support for [Cooklang](https://cooklang.org)

![Screenshot](https://github.com/cooklang/cooklang-obsidian/raw/main/screenshot.png)

> Looking for maintainers, reach out dubadub on Discor server.

## Installation
- This plugin has been submitted community plugins repo. You can install it from Communinty Plugins within Obsidian.
- You can build and install the plugin manually by checking out the files to `<your vault>/.obsidian/plugins/cooklang-obsidian` and running `npm install` and then `npm run build`.

## Rich preview

Opening a `.cook` file and toggling Preview shows a single rich recipe page:

- **Hero** with the recipe title, description, **title image** (a sibling file named like
  the recipe, e.g. `Curry.jpg`), and meta pills for total time, servings, difficulty,
  source and tags.
- **Servings scaler** — a `− N servings +` control in the sticky bar that rescales every
  ingredient quantity (and inline quantities in the steps) in real time.
- **Two-column layout** on wide panes: a sticky ingredient checklist beside the steps; it
  stacks into a single column on narrow panes and mobile.
- **Cooklang sections** (`= Section =`) group both the ingredients and the steps, and
  `> notes` render as callouts.
- **Per-step images** following the [Cooklang convention](https://cooklang.org/docs/spec/#adding-pictures)
  (`Recipe.0.jpg` for the first step, `Recipe.1.jpg` for the second, …).
- **Step tracking** — tap a step to mark it current and dim completed steps.

Each of these can be toggled in the plugin settings (Servings scaler, Two-column layout,
Step tracking), falling back to a simple stacked list.

## Recipe references

Reference another recipe with Cooklang ingredient syntax, for example
`@./Components/Beans`. References resolve relative to the recipe containing
them. The plugin opens a matching `.cook` file first, following the Cooklang
convention. If no `.cook` file exists, it falls back to a same-path Markdown
file only when its frontmatter contains the Boolean flag:

```yaml
---
recipe: true
---
```

This works in full recipe views and in embedded `cook`/`cooklang` blocks.

## Security
> Third-party plugins can access files on your computer, connect to the internet, and even install additional programs.

The source code of this plugin is available on GitHub for you to audit yourself, but installing plugins into Obsidian is a matter of trust.

I can assure you here that I do nothing to collect your data, send information to the internet or otherwise do anything nefarious with your system. However, be aware that I *could*, and without auditing the code yourself, you only have my word that I don't.

# Roadmap
This is the stuff I would ideally like to include in this plugin that isn't available as yet:
- [x] Improve editor/preview mode buttons to be more like markdown
- [x] Command to convert `.md` to `.cook`
    - [ ] Maybe also `cook` code block support?
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
