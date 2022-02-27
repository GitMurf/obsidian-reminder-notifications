declare module "obsidian" {
    interface WorkspaceLeaf {
        containerEl: HTMLElement;
    }
}

export enum TimeType {
    milliseconds,
    seconds,
    minutes,
    hours,
    days,
    weeks,
    months,
    quarters,
    years
}

export interface MyPluginSettings {
    MyConfigSettings: SettingsObject;
    lastUpdated: number;
    reminders: Reminder[];
    archived: Reminder[];
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
    seen: string[];
    notes: string;
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