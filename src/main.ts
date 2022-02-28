import { Plugin } from 'obsidian';
import { MyPluginSettings } from 'src/types';
import { newReminderModals, SampleModal } from './ui';
import { SampleSettingTab, DEFAULT_SETTINGS } from 'src/settings';
import { checkForReminders, getDeviceName, updateDataJsonModVar } from './helpers';

const pluginName = 'Reminder Notifications';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    modalResponse: string[];
    deviceId: string;
    pluginFolderDir: string;
    lastLoadDataJsonModified: number;

    async onload() {
        //Get (or create) the Device Name (Obsidian Sync) or randomly created device ID. Use to track if device has seen a notification
        this.deviceId = getDeviceName(this);
        console.log(`loading plugin: ${pluginName} [${this.deviceId}]`);

        //Set the dataJsonModified variable to track the last time the data.json file was modified and loaded
        this.pluginFolderDir = this.manifest.dir;
        this.lastLoadDataJsonModified = 0;
        await this.loadSettings();
        await this.saveSettings();

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('clock', 'Reminder', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
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
        const sec = 10;
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
        await updateDataJsonModVar(this, "Loaded settings: ");
    }

    async saveSettings() {
        await this.saveData(this.settings);
        await updateDataJsonModVar(this, "Saved settings: ");
    }
}
