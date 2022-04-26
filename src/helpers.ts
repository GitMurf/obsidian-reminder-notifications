import { Plugin, Stat, WorkspaceLeaf } from "obsidian";
import MyPlugin, { VIEW_TYPE } from "./main";
import { Reminder, TimeType } from "./types";
import { ReminderNotice, ReminderNotificationsView } from "./ui";

export async function checkForReminders(plugin: MyPlugin, myIntervalId: number, ignoreSync: boolean = false): Promise<void> {
    const newDateTimeNumber = new Date().getTime();

    //Check if the plugin instance is still loaded
    //Trying to avoid issues with multiple plugins instances loaded or setIntervals being orphaned running
    const pluginId = plugin.manifest.id;
    //const foundPlugin = plugin.app.plugins.plugins.find((p) => p.manifest.id === pluginId) as MyPlugin;
    const communityPluginsArr = Object.values(plugin.app.plugins.plugins);
    const foundPlugin = communityPluginsArr.find((p) => p.manifest.id === pluginId) as MyPlugin;
    const foundPluginHash = foundPlugin ? foundPlugin.pluginHashId : "";
    if (plugin._loaded === false || plugin.pluginHashId !== foundPluginHash) {
        console.log(`[${plugin.pluginHashId}]: Plugin instance hash does not match [${foundPluginHash}]. Stopping SetInterval.`);
        clearInterval(myIntervalId);
        plugin.unload();
        return;
    }

    //Need to load settings here (if Data.json has been updated) in case changed from another device; Obsidian does not reload variables otherwise
    const syncPlugin = getSyncPlugin(plugin);
    if (syncPlugin && !ignoreSync) {
        //Using the syncStatus instead of the syncing state because for whatever reasons sometimes the syncing state is set to "true" even though syncStatus is "Fully synced"
        const syncPluginSyncing = syncPlugin.instance.syncing;
        const syncPluginStatus = syncPlugin.instance.syncStatus;
        const syncPluginPaused = syncPlugin.instance.pause;
        if (syncPluginStatus !== "Fully synced" && syncPluginStatus !== "Paused" && syncPluginStatus !== "Connecting to server") {
            //console.log(`[${formatDate()}] ABORTING: Obsidian Sync is in the process of syncing [Syncing: ${syncPluginSyncing}] [Status: ${syncPluginStatus}]. Skipping reminder check. [${plugin.pluginHashId}]`);
            return;
        }
    }
    await reloadDataJsonIfNewer(plugin);

    let viewResults: {
        id: number;
        title: string;
        created: number;
        nextReminder: number;
        collapsed: boolean;
    }[] = [];
    const myReminders = plugin.settings.reminders;
    //loop through all reminders
    let ctrNew = 0;
    let ctrArchived = 0;
    for (let i = 0; i < myReminders.length; i++) {
        const reminder = myReminders[i];
        const seenAlready = reminder.seen.includes(plugin.deviceId);
        const completedAlready = reminder.completed;

        if (completedAlready === null || completedAlready === undefined || completedAlready === 0) {
            //Not marked as completed yet
            //Whether "seen" or not, still should just apply as if hadn't been seen before even if re-show a notification
                //In theory if not marked as complete then should not be seen yet... accounting for fluke scenarios just in case to show again
            //console.log("Reminder NOT marked as completed yet");
            //Update the leaf view display for reminders
            viewResults.push({ id: reminder.id, title: reminder.title, created: reminder.createdAt, nextReminder: reminder.remindNext, collapsed: reminder.collapsed });
            const nextReminder = reminder.remindNext;
            if (nextReminder) {
                if (nextReminder < newDateTimeNumber && nextReminder > 0) {
                    ctrNew++;
                    reminderShowNotification(plugin, reminder, newDateTimeNumber);
                    const archived = reminderArchive(plugin, reminder, i);
                    if (archived) {
                        ctrArchived++;
                    }
                }
            }
        } else {
            //Marked as completed but it still isn't archived yet
            console.log("Reminder marked as completed but it still isn't archived yet");
            if (seenAlready) {
                //Already seen, but not archived yet. Do NOT show notification again but check if should be archived
                const archived = reminderArchive(plugin, reminder, i);
                if (archived) {
                    ctrArchived++;
                }
            } else {
                //Not seen before, so show notification and check if should be archived
                const nextReminder = reminder.remindNext;
                if (nextReminder) {
                    if (nextReminder < newDateTimeNumber && nextReminder > 0) {
                        ctrNew++;
                        reminderShowNotification(plugin, reminder, newDateTimeNumber);
                        const archived = reminderArchive(plugin, reminder, i);
                        if (archived) {
                            ctrArchived++;
                        }
                    }
                }
            }
        }
    }

    //Only refresh the view if it is currently open/active in view of user
    if (isViewActive(plugin)) {
        //Reset the view clearing it and setting the variables to use below
        //NOTE: you need to empty and re-create each time in order to update the countdown timers etc.
        //Easier than trying to find the existing DOM elements and update them each time
        const remLeaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE).first();
        let remView: ReminderNotificationsView | undefined;
        let resultsContainer: HTMLDivElement | undefined;
        if (remLeaf) {
            remView = remLeaf.view as ReminderNotificationsView;
            resultsContainer = remView.contentEl.querySelector(".search-results-children") as HTMLDivElement;
            //resultsContainer.empty();
        }
        //Update the leaf view display for reminders
        if (resultsContainer && remView) {
            //Remove any DOM child elements for reminders that have expired or been archived
            const reminderEls = Array.from(resultsContainer.querySelectorAll(".tree-item.search-result"));
            reminderEls.forEach((remEl) => {
                const remElId = parseInt(remEl.id);
                const foundReminder = viewResults.find((r) => r.id === remElId);
                if (!foundReminder) {
                    //Reminder has been deleted. Remove it from the DOM
                    remEl.detach();
                }
            });
            viewResults.sort((a, b) => a.nextReminder - b.nextReminder);
            let ctr = 0;
            viewResults.forEach(element => {
                if (remView && resultsContainer) {
                    remView.addCollapsableResult(resultsContainer, { ctr: ctr, id: element.id, title: element.title, created: element.created, reminder: element.nextReminder, collapsed: element.collapsed });
                }
                ctr++;
            });
        }
    }

    if (ctrNew > 0 || ctrArchived > 0) {
        ctrNew > 0 ? console.log("Reminders Updated: " + ctrNew) : null;
        ctrArchived > 0 ? console.log("Old Reminders Archived: " + ctrArchived) : null;
        plugin.settings.lastUpdated = newDateTimeNumber;
        await plugin.saveSettings();
        console.log("Reminders saved");
    }
}

function reminderMarkComplete(plugin: MyPlugin, reminder: Reminder, completedTime: number = new Date().getTime()) {
    reminder.completed = completedTime;
}

function reminderShowNotification(plugin: MyPlugin, reminder: Reminder, completedTime: number) {
    reminderMarkComplete(plugin, reminder, completedTime);
    const nextReminder = reminder.remindNext;
    new ReminderNotice(`${reminder.title}`, nextReminder, 60 * 60);
    desktopNotification(plugin, reminder);
    reminder.modifiedAt = reminder.completed;
    reminder.remindPrev.push(reminder.remindNext);
    //reminder.remindNext = reminder.remindNext + (1 * 60000);
    reminder.seen.push(plugin.deviceId);
    const newNote = `[${plugin.deviceId}] Completed reminder at ${formatDate(completedTime)}`;
    const updatedNote = reminder.notes ? `${reminder.notes}\n${newNote}` : newNote;
    reminder.notes = updatedNote;
    console.log(reminder);
    console.log(reminder.notes);
}

function desktopNotification(plugin: MyPlugin, reminder: Reminder) {
    const notTitle = reminder.title;
    const notOptions = {
        body: formatDate(reminder.remindNext),
        icon: "https://avatars.githubusercontent.com/u/65011256?s=200&v=4",
        silent: false,
        tag: `${reminder.id}`,
    }
    const notificationObj = new Notification(notTitle, notOptions);
    //notificationObj.newTest = "log me now";
    notificationObj.onclick = function (event) {
        event.preventDefault(); // prevent the browser from focusing the Notification's tab
        console.log(`this is a click test: ${notificationObj.tag}`);
        console.log(this);
        //console.log(this.newTest);
        //window.open('obsidian://open?vault=RoamImport_2021_02_18&file=new%2FUntitled%206', '_blank');
    };

    notificationObj.onclose = function (event) {
        event.preventDefault(); // prevent the browser from focusing the Notification's tab
        console.log(`this is a CLOSE test: ${notificationObj.tag}`);
        console.log(this);
        //window.open('obsidian://open?vault=RoamImport_2021_02_18&file=new%2FUntitled%206', '_blank');
    };
}

function reminderArchive(plugin: MyPlugin, reminder: Reminder, remIndex: number): boolean {
    const currentTime = new Date().getTime();
    const bufferTime = addTime(currentTime, TimeType.seconds, -30);

    if (reminder.completed < bufferTime) {
        const newNote = `[${plugin.deviceId}] Archiving reminder at ${formatDate(currentTime)}`;
        const updatedNote = reminder.notes ? `${reminder.notes}\n${newNote}` : newNote;
        reminder.notes = updatedNote;
        console.log(reminder.notes);
        //move the reminder to the archived list
        plugin.settings.archived.push(reminder);
        //reminder has been completed, remove it from the reminders list
        plugin.settings.reminders.splice(remIndex, 1);
        return true;
    } else {
        console.log(`currentTime: ${formatDate(currentTime)}`);
        console.log(`bufferTime: ${formatDate(bufferTime)}`);
        console.log(`completed: ${formatDate(reminder.completed)}`);
        console.log(reminder.seen);
        return false;
    }
}

export async function reminderDelete(plugin: MyPlugin, reminderId: number) {
    const myReminders = plugin.settings.reminders;
    const targetReminder = myReminders.findIndex(reminder => reminder.id === reminderId);
    if (targetReminder > -1) {
        myReminders.splice(targetReminder, 1);
        plugin.settings.lastUpdated = new Date().getTime();
        await plugin.saveSettings();
    }
}

export async function reminderSetPropById<T extends keyof Reminder>(plugin: MyPlugin, reminderId: number, prop: T, value: Reminder[T]) {
    const myReminders = plugin.settings.reminders;
    const targetReminder = myReminders.find(reminder => reminder.id === reminderId);
    if (targetReminder) {
        targetReminder[prop] = value;
        plugin.settings.lastUpdated = new Date().getTime();
        //Don't want to force a save and obsidian sync every time you click collapse/expand
        //await plugin.saveSettings();
    }
}

async function reloadDataJsonIfNewer(plugin: MyPlugin): Promise<void> {
    const lastDataJsonLoad = plugin.lastLoadDataJsonModified;
    const dataJsonPath = `${plugin.pluginFolderDir}/data.json`;
    const getDataJsonFileStats = await getFileStats(plugin, dataJsonPath);
    const dataJsonModified = getDataJsonFileStats ? getDataJsonFileStats.mtime : 0;
    const modDiff = dataJsonModified - lastDataJsonLoad;
    if (modDiff > 0) {
        console.log(`Data.json modified time is ${Math.floor(modDiff / 1000)} seconds newer than your last Loaded Variables. Loading data.json settings now.`);
        await plugin.loadSettings();
    }
    plugin.lastLoadDataJsonModified = dataJsonModified;
}

export async function updateDataJsonModVar(plugin: MyPlugin, prependStr: string = ""): Promise<void> {
    const getDataJsonFileStats = await getFileStats(plugin, `${plugin.pluginFolderDir}/data.json`);
    if (getDataJsonFileStats) {
        if (plugin.lastLoadDataJsonModified !== getDataJsonFileStats.mtime) {
            plugin.lastLoadDataJsonModified = getDataJsonFileStats.mtime;
            console.log(`${prependStr}Updated the lastLoadDataJsonModified variable. Data.json last modified: ${formatDate(plugin.lastLoadDataJsonModified)}`);
        }
    }
}

async function getFileStats(plugin: Plugin, filePath: string): Promise<Stat | null> {
    const fileStats = await plugin.app.vault.adapter.stat(filePath);
    return fileStats;
}

export function getTimeTypeString(ttEnum: TimeType): string {
    return TimeType[ttEnum];
}

export function getTimeTypeEnumFromString(TimeTypeString: string): TimeType {
    let findEnum: TimeType;
    switch (TimeTypeString) {
        case getTimeTypeString(TimeType.milliseconds):
            findEnum = TimeType.milliseconds;
            break;
        case getTimeTypeString(TimeType.seconds):
            findEnum = TimeType.seconds;
            break;
        case getTimeTypeString(TimeType.minutes):
            findEnum = TimeType.minutes;
            break;
        case getTimeTypeString(TimeType.hours):
            findEnum = TimeType.hours;
            break;
        case getTimeTypeString(TimeType.days):
            findEnum = TimeType.days;
            break;
        case getTimeTypeString(TimeType.weeks):
            findEnum = TimeType.weeks;
            break;
        case getTimeTypeString(TimeType.months):
            findEnum = TimeType.months;
            break;
        case getTimeTypeString(TimeType.quarters):
            findEnum = TimeType.quarters;
            break;
        case getTimeTypeString(TimeType.years):
            findEnum = TimeType.years;
            break;
        default:
            findEnum = TimeType.minutes;
            break;
    }
    return findEnum;
}

export function formatDate(dateTimeNumber: number | Date = new Date(), formatStr: string = "YYYY-MM-DD hh:mm.ss A"): string {
    let dateTime: Date;
    if (typeof dateTimeNumber === "number") {
        dateTime = new Date(dateTimeNumber);
    } else {
        dateTime = dateTimeNumber;
    }
    const formattedDate = window.moment(dateTime).format(formatStr);
    return formattedDate;
}

export function getTimeDurationString(duration: number, timeType: TimeType): string {
    const timeTypeString = getTimeTypeString(timeType);
    let finalString = `${duration} ${timeTypeString}`;
    //if the duration is 1, remove the plural "s" on the end
    if (duration === 1) {
        finalString = finalString.substring(0, finalString.length - 1);
    }
    return finalString;
}

export function addTime(dateTimeNumber: number | Date, addType: TimeType, addValue: number): number {
    let dateTime: Date;
    if (typeof dateTimeNumber === "number") {
        dateTime = new Date(dateTimeNumber);
    } else {
        dateTime = dateTimeNumber;
    }
    //add time with moment.js
    let newDateTime: Date = window.moment(dateTime).toDate();
    switch (getTimeTypeString(addType)) {
        case "milliseconds":
            newDateTime = window.moment(newDateTime).add(addValue, "milliseconds").toDate();
            break;
        case "seconds":
            newDateTime = window.moment(newDateTime).add(addValue, "seconds").toDate();
            break;
        case "minutes":
            newDateTime = window.moment(newDateTime).add(addValue, "minutes").toDate();
            break;
        case "hours":
            newDateTime = window.moment(newDateTime).add(addValue, "hours").toDate();
            break;
        case "days":
            newDateTime = window.moment(newDateTime).add(addValue, "days").toDate();
            break;
        case "weeks":
            newDateTime = window.moment(newDateTime).add(addValue, "weeks").toDate();
            break;
        case "months":
            newDateTime = window.moment(newDateTime).add(addValue, "months").toDate();
            break;
        case "quarters":
            newDateTime = window.moment(newDateTime).add(addValue, "quarters").toDate();
            break;
        case "years":
            newDateTime = window.moment(newDateTime).add(addValue, "years").toDate();
            break;
    }

    return newDateTime.getTime();
}

export function getDeviceName(plugin: Plugin) {
    let deviceName = "";
    //Check if Obsidian Sync is enabled
    const syncPlugin = getSyncPlugin(plugin);
    if (syncPlugin) {
        const syncPluginInst = syncPlugin.instance;
        deviceName = syncPluginInst.deviceName ? syncPluginInst.deviceName : syncPluginInst.getDefaultDeviceName();
    }
    if (!deviceName) { deviceName = createRandomHashId(); }
    return deviceName;
}

function getSyncPlugin(plugin: Plugin) {
    //Check if Obsidian Sync is enabled
    const syncPlugin = plugin.app.internalPlugins.plugins["sync"];
    if (syncPlugin) {
        if (syncPlugin.enabled) {
            return syncPlugin;
        }
    }
    return null;
}

export function isObsidianSyncLoaded(plugin: Plugin): boolean {
    const isSyncLoaded = getSyncPlugin(plugin) ? true : false;
    return isSyncLoaded;
}

export function createRandomHashId(charCt: number = 7): string {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < charCt; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export async function sleepDelay(plugin: MyPlugin, seconds: number): Promise<void> {
    //console.log(`[${formatDate()}] Sleeping for ${seconds} seconds. [${plugin.pluginHashId}]`);
    return new Promise(resolve => { setTimeout(resolve, seconds * 1000); });
}

export function isViewActive(plugin: MyPlugin, reminderLeaf: WorkspaceLeaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE)[0]) {
    //Check if the view is currently open/active in view of user (in sidebar for example)
    if (reminderLeaf) {
        if (reminderLeaf.view.containerEl.isShown()) {
            //console.log('ACTIVE');
            return true;
        } else {
            //console.log('not currently active');
            return false;
        }
    } else {
        return false;
    }
}
