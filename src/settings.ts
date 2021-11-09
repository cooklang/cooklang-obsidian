import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CookView } from './cookView';

declare class CookPlugin extends Plugin {
  settings: CookLangSettings;
  reloadCookViews(): void;
}

export class CookLangSettings {
  showImages: boolean = true;
  showIngredientList: boolean = true;
  showCookwareList: boolean = true;
  showTotalTime: boolean = true;
  showQuantitiesInline: boolean = false;
}

export class CookSettingsTab extends PluginSettingTab {
  plugin: CookPlugin;
  constructor(app: App, plugin: CookPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Preview Options')
      .setHeading();

    new Setting(containerEl)
      .setName('Show images')
      .setDesc('Show images in the recipe (see https://cooklang.org/docs/spec/#adding-pictures)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showImages)
        .onChange((value: boolean) => {
          this.plugin.settings.showImages = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Show ingredient list')
      .setDesc('Show the list of ingredients at the top of the recipe')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showIngredientList)
        .onChange((value: boolean) => {
          this.plugin.settings.showIngredientList = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Show cookware list')
      .setDesc('Show the list of cookware at the top of the recipe')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showCookwareList)
        .onChange((value: boolean) => {
          this.plugin.settings.showCookwareList = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Show total time')
      .setDesc('Show the total of all timers at the top of the recipe')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTotalTime)
        .onChange((value: boolean) => {
          this.plugin.settings.showTotalTime = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Show quantities inline')
      .setDesc('Show the ingredient quantities inline in the recipe method')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showQuantitiesInline)
        .onChange((value: boolean) => {
          this.plugin.settings.showQuantitiesInline = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));
  }

  
}