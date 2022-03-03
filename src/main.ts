import { Plugin } from 'obsidian';
import { MyPluginSettings } from 'src/types';
import { NewReminderModals, SampleModal } from './ui';
import { SampleSettingTab, DEFAULT_SETTINGS } from 'src/settings';
import { checkForReminders, createRandomHashId, formatDate, getDeviceName, isObsidianSyncLoaded, sleepDelay, updateDataJsonModVar } from './helpers';

const pluginName = 'Reminder Notifications';

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings = DEFAULT_SETTINGS;
    modalResponse: string[] = [];
    deviceId: string = "";
    pluginFolderDir: string = "";
    lastLoadDataJsonModified: number = 0;
    pluginHashId: string = "";

    async onload() {
        //NOT using an await here because don't want to hold up Obsidian loading overall
        this.delayedPluginLoad();
    }

    async delayedPluginLoad() {
        this.pluginHashId = createRandomHashId();
        this.deviceId = this.pluginHashId;
        //Wait 20 seconds to allow Obsidian sync to load and sync
        await sleepDelay(this, 20);
        //Check if Obsidian sync is loaded and wait longer if not
        if (isObsidianSyncLoaded(this) === false) {
            await sleepDelay(this, 5);
            //Check one more time and do one final check before moving on and letting the plugin load without Sync
            if (isObsidianSyncLoaded(this) === false) {
                await sleepDelay(this, 5);
            }
        }
        //Before loading further check to see if the plugin instance is still loaded
            //This prevents multiple instances of the plugin from being loaded like when hotreload plugin sometimes reloads multiple times in a row
        if (this._loaded === false) {
            console.log(`[${this.pluginHashId}]: This Plugin instance is no longer loaded after the sleep delay... aborting to avoid loading twice.`);
            this.unload();
            return;
        }

        //Get (or create) the Device Name (Obsidian Sync) or randomly created device ID. Use to track if device has seen a notification
        this.deviceId = getDeviceName(this);
        console.log(`Loading plugin: ${pluginName} [Device: ${this.deviceId}] [Hash: ${this.pluginHashId}] ${formatDate()}`);

        //Set the dataJsonModified variable to track the last time the data.json file was modified and loaded
        this.pluginFolderDir = this.manifest.dir ? this.manifest.dir : "";
        this.lastLoadDataJsonModified = 0;
        await this.loadSettings();
        if (await this.app.vault.adapter.exists(`${this.pluginFolderDir}/data.json`) === false) {
            //Only start with a save if the data.json file doesn't exist. We don't want an old data.json file to be loaded and then saved which would overwrite the data.json from other devices with Obsidian Sync
            await this.saveSettings();
        }

        // This creates an icon in the left ribbon.
        // Icon options I like alarm-clock, alarm-plus, bell-plus... see here: https://lucide.dev/
        const ribbonIconEl = this.addRibbonIcon('bell-plus', 'Reminder', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            this.modalResponse = [];
            const modalSelect = new NewReminderModals(this.app, this);
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

        const min = 0;
        const sec = 10;
        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        let myInterval = window.setInterval(() => {
            checkForReminders(this, myInterval);
        }, (min * 60 * 1000) + (sec * 1000))
        this.registerInterval(myInterval);
    }

    onunload() {
        console.log(`Unloading plugin: ${pluginName} [Device: ${this.deviceId}] [Hash: ${this.pluginHashId}]`);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        await updateDataJsonModVar(this, `[${this.pluginHashId}] [${formatDate()}] Loaded settings: `);
    }

    async saveSettings() {
        await this.saveData(this.settings);
        await updateDataJsonModVar(this, `[${this.pluginHashId}] [${formatDate()}] Saved settings: `);
    }
}
