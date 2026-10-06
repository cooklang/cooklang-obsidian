# Dev flow

## Prerequisites

- [Node.js 24 LTS](https://nodejs.org/)
- npm 11

With [nvm](https://github.com/nvm-sh/nvm), install and select the repository's
Node.js version:

```sh
nvm install
nvm use
```

1. Create a symbolic link to the repo inside Obsidian plugins dir

```sh
$ pwd
~/Documents/Knowledge/.obsidian/plugins
$ ln -s ../../../../Cooklang/cooklang-obsidian
```

2. Install dependencies

```sh
npm ci
```

3. Build the plugin

```sh
npm run build
```

4. Find "Cooklang Editor" plugin in community plugins, install and enable (or reenable).

5. Rinse and repeat from step 3

## Checks

Pull-request CI lints commit messages, then typechecks, tests, and builds. Run the same steps locally before pushing:

```sh
npm run check
```

`npm run commitlint` lints only the commits since `origin/main`, or `main` when `origin/main` is absent. Set `COMMITLINT_FROM` to use another base ref.
