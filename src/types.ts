declare module "obsidian" {
    interface WorkspaceLeaf {
        containerEl: HTMLElement;
    }
    interface App {
        internalPlugins: {
            plugins: {
                "sync": {
                    app: App;
                    enabled: boolean;
                    hasStatusBarItem: boolean;
                    instance: {
                        allowSpecialFiles: Set<string>;
                        allowTypes: Set<string>;
                        app: App;
                        deviceName: string;
                        id: string;
                        name: string;
                        pause: boolean;
                        ready: boolean;
                        scanSpecialFiles: boolean;
                        syncLog: {
                            error: boolean;
                            file: string;
                            info: string;
                            ts: number;
                        }[];
                        syncStatus: string;
                        syncing: boolean;
                        vaultId: string;
                        vaultName: string;
                        version: number;
                        getDefaultDeviceName: () => string;
                    };
                    statusBarEl: HTMLDivElement;
                }
            };
        };
    }
    interface Notice {
        noticeEl: HTMLDivElement;
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