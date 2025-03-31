# Dev flow

1. Create a symbolic link to the repo inside Obsidian plugins dir

```sh
$ pwd
~/Documents/Knowledge/.obsidian/plugins
$ ln -s ../../../../Cooklang/cooklang-obsidian
```

2. Install dependencies

```
npm install
```

3. Build the plugin

```sh
npm run build
```

4. Find "Cooklang Editor" plugin in community plugins, install and enable (or reenable).

5. Rinse and repeat from step 3
