import * as momentJs from "moment";

declare module "obsidian" {
    interface WorkspaceLeaf {
        containerEl: HTMLDivElement;
        tabHeaderEl: HTMLDivElement;
    }
    interface Plugin {
        "_loaded": boolean;
    }
    interface App {
        plugins: {
            plugins: Record<string, Plugin>;
            getPlugin(name: string): Plugin;
        };
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
    interface nldPlugin extends Plugin {
        parseDate(dtString: string): {
            date: Date;
            formattedString: string;
            moment: momentJs.Moment;
        }
    }
    interface WorkspaceRibbon {
        collapseButtonEl: HTMLDivElement;
        containerEl: HTMLDivElement;
        isMobile: boolean;
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
    recurring: Recurrence | null;
    remind: Alert[];
    completed: number;
    seen: string[];
    notes: string;
    collapsed: boolean;
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