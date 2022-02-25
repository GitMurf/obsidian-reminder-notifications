import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';
import { MyPluginSettings } from './types';

export const DEFAULT_SETTINGS: MyPluginSettings = {
    MyConfigSettings: {
        mySetting: 'default',
        setting2: 2,
        setting3: 'three'
    },
    reminders: [{ id: 1, createdAt: new Date(), modifiedAt: new Date(), title: 'test', content: 'this is some content', remindNext: new Date(), remindPrev: new Date(), recurring: { type: 'minutes', start: new Date(), end: new Date(), interval: 1 }, remind: [{ type: 'minutes', value: 15 }], completed: null }]
}

export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.MyConfigSettings.mySetting)
                .onChange(async (value) => {
                    console.log('Secret: ' + value);
                    this.plugin.settings.MyConfigSettings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}
