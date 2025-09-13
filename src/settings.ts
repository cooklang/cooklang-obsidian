import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CookView } from './cookView';

declare class CookPlugin extends Plugin {
  settings: CooklangSettings;
  reloadCookViews(): void;
}

export class CooklangSettings {
  showImages: boolean = true;
  showIngredientList: boolean = true;
  showCookwareList: boolean = true;
  showTimersList: boolean = false;
  showTotalTime: boolean = true;
  showTimersInline: boolean = true;
  showQuantitiesInline: boolean = false;
  timersTick: boolean = true;
  timersRing: boolean = true;
  lineWrap: boolean = true;
  enhancedCss: boolean = true;
  metadataLabel: string = "";
  ingredientLabel: string = "";
  cookwareLabel: string = "";
  timersLabel: string = "";
  methodLabel: string = "";
  minutesLabel: string = "";
  hoursLabel: string = "";
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
      .setName('Line Wrap')
      .setDesc('Wrap long lines')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.lineWrap)
        .onChange((value: boolean) => {
          this.plugin.settings.lineWrap = value;
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
      .setName('Show quantities inline')
      .setDesc('Show the ingredient quantities inline in the recipe method')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showQuantitiesInline)
        .onChange((value: boolean) => {
          this.plugin.settings.showQuantitiesInline = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Show timers list')
      .setDesc('Show the list of timers at the top of the recipe')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTimersList)
        .onChange((value: boolean) => {
          this.plugin.settings.showTimersList = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Inline interactive timers')
      .setDesc('Allow clicking on a time in a recipe method to start a timer')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTimersInline)
        .onChange((value: boolean) => {
          this.plugin.settings.showTimersInline = value;
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
      .setName('Running Timers Tick')
      .setDesc('Play a ticking sound while a timer is running')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.timersTick)
        .onChange((value: boolean) => {
          this.plugin.settings.timersTick = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Alarm When Timers End')
      .setDesc('Play a ring sound when a running timer finishes')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.timersRing)
        .onChange((value: boolean) => {
          this.plugin.settings.timersRing = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

      new Setting(containerEl)
      .setName('Enable Enhanced Styling')
      .setDesc('Apply additional CSS rules to improve the overall design and readability (reopen the recipe to apply changes).')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enhancedCss)
        .onChange((value: boolean) => {
          this.plugin.settings.enhancedCss = value;
          this.plugin.saveData(this.plugin.settings);
          this.plugin.reloadCookViews();
        }));

    new Setting(containerEl)
      .setName('Custom Labels')
      .setHeading();

    new Setting(containerEl)
      .setName("Metadata Label")
      .setDesc("Choose your label for the metadata")
      .addText((text) => text
      .setValue(this.plugin.settings.metadataLabel)
      .setPlaceholder("Metadata")
      .onChange(async (value) => {
        this.plugin.settings.metadataLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));
        
    new Setting(containerEl)
      .setName("Ingredient Label")
      .setDesc("Choose your label for the ingredients")
      .addText((text) => text
      .setValue(this.plugin.settings.ingredientLabel)
      .setPlaceholder("Ingredients")
      .onChange(async (value) => {
        this.plugin.settings.ingredientLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));

    new Setting(containerEl)
      .setName("Cookware Label")
      .setDesc("Choose your label for cookware")
      .addText((text) =>
      text
      .setValue(this.plugin.settings.cookwareLabel)
      .setPlaceholder("Cookware")
      .onChange(async (value) => {
        this.plugin.settings.cookwareLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));

    new Setting(containerEl)
      .setName("Timer Label")
      .setDesc("Choose your label for timers")
      .addText((text) => text
      .setValue(this.plugin.settings.timersLabel)
      .setPlaceholder("Timers")
      .onChange(async (value) => {
        this.plugin.settings.timersLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));

    new Setting(containerEl)
      .setName("Method Label")
      .setDesc("Choose your label for the cooking method")
      .addText((text) => text
      .setValue(this.plugin.settings.methodLabel)
      .setPlaceholder("Method")
      .onChange(async (value) => {
        this.plugin.settings.methodLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));

    new Setting(containerEl)
      .setName("Minutes Label")
      .setDesc("Choose your label(s) for minutes (comma separated)")
      .addText((text) => text
      .setValue(this.plugin.settings.minutesLabel)
      .setPlaceholder("m,min,minute,minutes")
      .onChange(async (value) => {
        this.plugin.settings.minutesLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));

    new Setting(containerEl)
      .setName("Hours Label")
      .setDesc("Choose your label(s) for hours (comma separated)")
      .addText((text) => text
      .setValue(this.plugin.settings.hoursLabel)
      .setPlaceholder("h,hr,hrs,hour,hours")
      .onChange(async (value) => {
        this.plugin.settings.hoursLabel = value;
        this.plugin.saveData(this.plugin.settings);
        this.plugin.reloadCookViews();
      }));
  }
}
