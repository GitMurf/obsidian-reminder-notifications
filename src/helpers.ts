import { Plugin, Stat } from "obsidian";
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
            console.log(`[${formatDate()}] ABORTING: Obsidian Sync is in the process of syncing [Syncing: ${syncPluginSyncing}] [Status: ${syncPluginStatus}]. Skipping reminder check. [${plugin.pluginHashId}]`);
            return;
        }
    }
    await reloadDataJsonIfNewer(plugin);

    //Reset the view clearing it and setting the variables to use below
    const remLeaf = plugin.app.workspace.getLeavesOfType(VIEW_TYPE).first();
    let remView: ReminderNotificationsView | undefined;
    let resultsContainer: HTMLDivElement | undefined;
    if (remLeaf) {
        remView = remLeaf.view as ReminderNotificationsView;
        resultsContainer = remView.contentEl.querySelector(".search-results-children") as HTMLDivElement;
        resultsContainer.empty();
    }

    let viewResults: {
        title: string;
        created: number;
        nextReminder: number;
    }[] = [];
    const myReminders = plugin.settings.reminders;
    //loop through all reminders
    let ctrNew = 0;
    let ctrArchived = 0;
    for (let i = 0; i < myReminders.length; i++) {
        const reminder = myReminders[i];
        const seenAlready = reminder.seen.includes(plugin.deviceId);
        const completedAlready = reminder.completed;

        //Update the leaf view display for reminders
        if (resultsContainer && remView) {
            viewResults.push({ title: reminder.title, created: reminder.createdAt, nextReminder: reminder.remindNext });
        }

        if (completedAlready === null || completedAlready === undefined || completedAlready === 0) {
            //Not marked as completed yet
            //Whether "seen" or not, still should just apply as if hadn't been seen before even if re-show a notification
                //In theory if not marked as complete then should not be seen yet... accounting for fluke scenarios just in case to show again
            //console.log("Reminder NOT marked as completed yet");
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

    //Update the leaf view display for reminders
    if (resultsContainer && remView) {
        viewResults.sort((a, b) => a.nextReminder - b.nextReminder);
        viewResults.forEach(element => {
            if (remView && resultsContainer) {
                remView.addCollapsableResult(resultsContainer, { title: element.title, created: element.created, reminder: element.nextReminder });
            }
        });
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
    console.log(`[${formatDate()}] Sleeping for ${seconds} seconds. [${plugin.pluginHashId}]`);
    return new Promise(resolve => { setTimeout(resolve, seconds * 1000); });
}
