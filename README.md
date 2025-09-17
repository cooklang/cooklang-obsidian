# Cooklang Editor Obsidian Plugin
[![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/deathau/cooklang-obsidian?style=for-the-badge&sort=semver)](https://github.com/cooklang/cooklang-obsidian/releases/latest)
![GitHub All Releases](https://img.shields.io/github/downloads/cooklang/cooklang-obsidian/total?style=for-the-badge)

A plugin for [Obsidian](https://obsidian.md) adding support for [Cooklang](https://cooklang.org)

![Screenshot](https://github.com/cooklang/cooklang-obsidian/raw/main/screenshot.png)

## Installation
- This plugin has been submitted community plugins repo. You can install it from Communinty Plugins within Obsidian.
- You can build and install the plugin manually by checking out the files to `<your vault>/.obsidian/plugins/cooklang-obsidian` and running `npm install` and then `npm run build`.

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
- [ ] Scaling up/down (check spec)
- [ ] Shopping list and `.conf` file support (needs designing)
- [ ] Better metadata support.
    - [ ] Making source links clickable.
    - [ ] Support for Obsidian tagging.
- [ ] (Maybe, pending feedback) Markdown formatting support.

# Version History

## 0.5.1
- Added: Settings for custom texts, Metadata, WebP https://github.com/cooklang/cooklang-obsidian/pull/54 by https://github.com/6c756b

## 0.5.0
- Migrated to `cooklang-ts`

## 0.4.1
- Fixed editor mode

## 0.4.0
- Fixed build and publishing

## 0.3.0
- Separated out the Cooklang parsing code into its own library, and brought it up to date with the latest Cooklang spec (so things like named timers are now supported properly)
- Added more options for displaying timers
- Added the ability to click on a timer and show a countdown
    - it also optionally plays a sound while the timer is running and when it's finished
    - This feature is still pretty new and probably needs more testing

## 0.2.0
- Changed comment syntax according to spec changes

## 0.1.1
- **Fixed:** Turning off inline measurements now actually removes all of them.
- **New:** Added commands to add new recipe files.

## 0.1.0
- Improve editor/preview mode buttons to be more like markdown views
    - You can even ctrl/cmd click to open in new pane!
- Include options for showing ingredients list, tools list and time
- Include option for showing quantities inline in the method

## 0.0.4
- Command to convert `.md` to `.cook`

## 0.0.3
- Fixes an issue preventing preview mode from working if no image is present

## 0.0.1
Initial release!
- You can open and edit `.cook` files
- There is an edit view with syntax highlighting
- There is also a preview view which displays the ingredients and amounts at the top like a traditional recipe
and numbers the steps.
- If images are provided (as per the [Cooklang convention](https://cooklang.org/docs/spec/#adding-pictures) ) they will also be displayed.
