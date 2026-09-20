# Markdown recipe integration checks

This is an ordinary Markdown note and must stay in Obsidian's native view.

Open [[markdown-rice]] and [[filename-rice.cook]]: each should open in recipe
preview. Use **Edit as Markdown**, edit properties, switch tabs, and return. The
native editor should remain selected until **Open as Recipe** or navigation away.
Back should return to this note without an intermediate Markdown-to-recipe entry.

## Repeated whole-note embeds

Each embed should show one linked title, ingredient list, and method. Change a
quantity in the source note and check both copies. There should be no images,
live timers, scaler, or step tracking, in Reading view or Live Preview.

![[markdown-rice]]

![[markdown-rice]]

![[filename-rice.cook]]

## Fenced recipes remain supported

```cook
Stir @rice{100%g} with @water{200%ml} for ~{2%min}.
```

```cooklang
Serve @rice{100%g}.
```

## Partial embeds remain native

This intentionally unresolved heading should retain Obsidian's native behavior,
rather than becoming a whole recipe:

![[markdown-rice#Missing heading]]

## Manual checks

- Search for `markdown-rice` and `rice`; check graph presence and incoming backlinks.
- With Dataview installed, use the query below. The property-marked recipe should
  appear; the filename-only recipe appears after adding `recipe: true`.
- On a copy of a fixture, convert through all three formats. Verify body and
  metadata, native link updates, image naming, and reopening after restart.
- Try an existing destination and invalid YAML. Check that neither overwrites a file.
- Check light/dark themes, a narrow pane, and mobile when available.
- Disable the plugin and verify that native recipe-note content is accessible.

```dataview
TABLE servings, tags
WHERE recipe = true
```
