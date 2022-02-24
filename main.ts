import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';
declare module "obsidian" {
    interface WorkspaceLeaf {
        containerEl: HTMLElement;
    }
}
type Occurrence = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
interface Recurrence {
    type: Occurrence;
    start: Date;
    end: Date;
    interval: number;
}
type Alert = {
    type: Occurrence;
    value: number;
}
interface Reminder {
    id: number;
    createdAt: Date;
    modifiedAt: Date;
    title: string;
    content: string;
    remindNext: Date;
    remindPrev: Date;
    recurring: Recurrence;
    remind: Alert[];
    completed: Date;
}
interface SettingsObject {
    mySetting: string;
    setting2: number;
    setting3: string;
}

const pluginName = 'Reminder Notifications';

interface MyPluginSettings {
    MyConfigSettings: SettingsObject;
    reminders: Reminder[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    MyConfigSettings: {
        mySetting: 'default',
        setting2: 2,
        setting3: 'three'
    },
    reminders: [{ id: 1, createdAt: new Date(), modifiedAt: new Date(), title: 'test', content: 'this is some content', remindNext: new Date(), remindPrev: new Date(), recurring: { type: 'minutes', start: new Date(), end: new Date(), interval: 1 }, remind: [{ type: 'minutes', value: 15 }], completed: null}]
}

export default class MyPlugin extends Plugin {
    settings: MyPluginSettings;

    async onload() {
        console.log("loading plugin: " + pluginName);
        await this.loadSettings();
        console.log(this.settings.reminders);
        this.settings.reminders[0].remindNext = window.moment(this.settings.reminders[0].remindNext).add(1, 'minutes').toDate();
        await this.saveSettings(); 

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('clock', 'Reminder', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            //createReminder(this.app, this);
            const modalSelect = new inputModal(this.app, this, "reminder");
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
        //this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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

class inputModal extends SuggestModal<string> {
    options: string[] = [];
    firstSet: string[] = ['minutes', 'hours', 'days', 'weeks', 'months'];
    secondSet: string[] = ['one', 'two', 'three', 'four'];
    thirdSet: string[] = ['blue', 'red', 'green', 'orange'];

    constructor( app: App, private thisPlugin: MyPlugin, private modalType: string ) {
        super(app);
        /*
            this.setPlaceholder("Enter any keyword(s) to filter by plain text search...");
            this.setInstructions([
                { command: 'Plain Text: ', purpose: 'No [[Page]] or #Tag required' },
            ]);
            this.limit = 5;
        */
        this.emptyStateText = 'No matches found';
        switch (this.modalType) {
            case "reminder":
                this.options = this.firstSet;
                this.modalType = "alert";
                break;
            case "alert":
                this.options = this.secondSet;
                this.modalType = "recurring";
                break;
            case "recurring":
                this.options = this.thirdSet;
                this.modalType = null;
                break;
            default:
                this.modalType = null;
                break;
        }
    }

    onOpen() {
        super.onOpen();
        this.lightenBackground();
    }

    lightenBackground() {
        let modalBg: HTMLElement = this.containerEl.querySelector('.modal-bg');
        if (modalBg) {
            modalBg.style.backgroundColor = '#00000029';
        }
        this.modalEl.style.border = '4px solid #483699';
    }

    getSuggestions(query: string): string[] {
        return this.options.filter(option => option.toLowerCase().includes(query.toLowerCase()));
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.innerText = value;
    }

    onNoSuggestion(): void {
        this.resultContainerEl.empty();
        super.onNoSuggestion();
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        this.onChooseSuggestion(value, evt);
    }

    onChooseSuggestion(item: string, _: MouseEvent | KeyboardEvent): void {
        console.log(item);
        this.close();
    }

    onClose(): void {
        if (this.modalType) {
            const modalSelect = new inputModal(this.app, this.thisPlugin, this.modalType);
            modalSelect.open();
        }
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

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
