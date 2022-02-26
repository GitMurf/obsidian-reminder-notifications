import { Plugin } from 'obsidian';
import { MyPluginSettings } from 'src/types';
import { newReminderModals, SampleModal } from './ui';
import { SampleSettingTab, DEFAULT_SETTINGS } from 'src/settings';
import { checkForReminders } from './helpers';

const pluginName = 'Reminder Notifications';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    modalResponse: string[];

    async onload() {
        console.log("loading plugin: " + pluginName);
        await this.loadSettings();
        await this.saveSettings(); 

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('clock', 'Reminder', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            //createReminder(this.app, this);
            
            //const modalSelect = new newReminderModal(this.app, this);
            //modalSelect.open();

            this.modalResponse = [];
            const modalSelect = new newReminderModals(this.app, this);
            modalSelect.open();
        });

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        /*
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');
        */

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Open sample modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        const min = 0;
        const sec = 30;
        this.registerInterval(
            window.setInterval(async () => {
                await checkForReminders(this);
            }, (min * 60 * 1000) + (sec * 1000)),
        );
    }

    onunload() {
        console.log("Unloading plugin: " + pluginName);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}