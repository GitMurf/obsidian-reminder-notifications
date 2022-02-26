declare module "obsidian" {
    interface WorkspaceLeaf {
        containerEl: HTMLElement;
    }
}

export interface MyPluginSettings {
    MyConfigSettings: SettingsObject;
    reminders: Reminder[];
}

interface SettingsObject {
    mySetting: string;
    setting2: number;
    setting3: string;
}

export interface Reminder {
    id: number;
    createdAt: number;
    modifiedAt: number;
    title: string;
    content: string;
    remindNext: number;
    remindPrev: number[];
    recurring: Recurrence;
    remind: Alert[];
    completed: number;
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