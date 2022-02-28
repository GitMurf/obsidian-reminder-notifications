import { Plugin } from 'obsidian';
import { MyPluginSettings } from 'src/types';
import { newReminderModals, SampleModal } from './ui';
import { SampleSettingTab, DEFAULT_SETTINGS } from 'src/settings';
import { checkForReminders, getDeviceName, isObsidianSyncLoaded, sleepDelay, updateDataJsonModVar } from './helpers';

const pluginName = 'Reminder Notifications';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;
    modalResponse: string[];
    deviceId: string;
    pluginFolderDir: string;
    lastLoadDataJsonModified: number;

    async onload() {
        if (isObsidianSyncLoaded(this) === false) {
            await sleepDelay(5);
            if (isObsidianSyncLoaded(this) === false) {
                await sleepDelay(5);
            }
        }
        //Get (or create) the Device Name (Obsidian Sync) or randomly created device ID. Use to track if device has seen a notification
        this.deviceId = getDeviceName(this);
        console.log(`loading plugin: ${pluginName} [${this.deviceId}]`);

        //Set the dataJsonModified variable to track the last time the data.json file was modified and loaded
        this.pluginFolderDir = this.manifest.dir;
        this.lastLoadDataJsonModified = 0;
        await this.loadSettings();
        if (await this.app.vault.adapter.exists(`${this.pluginFolderDir}/data.json`) === false) {
            //Only start with a save if the data.json file doesn't exist. We don't want an old data.json file to be loaded and then saved which would overwrite the data.json from other devices with Obsidian Sync
            await this.saveSettings();
        }

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
