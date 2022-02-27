import { Notice, Plugin, Stat } from "obsidian";
import MyPlugin from "./main";
import { TimeType } from "./types";

export async function checkForReminders(plugin: MyPlugin) {
    const newDateTimeNumber = new Date().getTime();

    //Need to load settings here (if Data.json has been updated) in case changed from another device; Obsidian does not reload variables otherwise
    await reloadDataJsonIfNewer(plugin);

    const myReminders = plugin.settings.reminders;
    //loop through all reminders
    let ctrNew = 0;
    let ctrArchived = 0;
    for (let i = 0; i < myReminders.length; i++) {
        const reminder = myReminders[i];
        const seenAlready = reminder.seen.includes(plugin.deviceId);
        const completedAlready = reminder.completed;
        if (reminder.completed === null || reminder.seen.indexOf(plugin.deviceId) === -1) {
            if (reminder.remindNext) {
                const nextReminder = reminder.remindNext;
                if (nextReminder < newDateTimeNumber && nextReminder > 0) {
                    ctrNew++;
                    showObsidianNotice(reminder.title);
                    reminder.modifiedAt = newDateTimeNumber;
                    reminder.remindPrev.push(reminder.remindNext);
                    //reminder.remindNext = reminder.remindNext + (1 * 60000);
                    reminder.completed = newDateTimeNumber;
                    reminder.seen.push(plugin.deviceId);
                    const newNote = `Completed reminder at ${formatDate(newDateTimeNumber)}\nArchiving this reminder`;
                    const updatedNote = reminder.notes ? `${reminder.notes}\n${newNote}` : newNote;
                    reminder.notes = updatedNote;
                    console.log(reminder.notes);
                    /* SKIPPING THIS NOW TO GIVE TIME FOR OTHER DEVICES TO SHOW A NOTIFICATION BEFORE IT ARCHIVES IT. WILL ARCHIVE ON THE NEXT CHECK.
                    //move the reminder to the archived list
                    plugin.settings.archived.push(reminder);
                    //remove the reminder from the reminders list
                    plugin.settings.reminders.splice(i, 1);
                    */
                }
            }
        } else {
            ctrArchived++;
            const newNote = `Archiving reminder at ${formatDate(newDateTimeNumber)}`;
            const updatedNote = reminder.notes ? `${reminder.notes}\n${newNote}` : newNote;
            reminder.notes = updatedNote;
            console.log(reminder.notes);
            //move the reminder to the archived list
            plugin.settings.archived.push(reminder);
            //reminder has been completed, remove it from the reminders list
            plugin.settings.reminders.splice(i, 1);
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

async function reloadDataJsonIfNewer(plugin: MyPlugin): Promise<void> {
    const lastDataJsonLoad = plugin.lastLoadDataJsonModified;
    const dataJsonPath = `${plugin.pluginFolderDir}/data.json`;
    const getDataJsonFileStats = await getFileStats(plugin, dataJsonPath);
    const dataJsonModified = getDataJsonFileStats ? getDataJsonFileStats.mtime : 0;
    const modDiff = dataJsonModified - lastDataJsonLoad;
    console.log(`FILE: ${formatDate(dataJsonModified)}`);
    console.log(` VAR: ${formatDate(lastDataJsonLoad)}`);
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

async function getFileStats(plugin: Plugin, filePath: string): Promise<Stat> {
    const fileStats = await plugin.app.vault.adapter.stat(filePath);
    return fileStats;
}

function showObsidianNotice(title: string, showTimeSeconds: number = 30) {
    const showTimeMs = showTimeSeconds * 1000;
    new Notice(title, showTimeMs);
}

export function getTimeTypeString(ttEnum: TimeType): string {
    return TimeType[ttEnum];
}

export function getTimeTypeEnumFromString(TimeTypeString: string): TimeType {
    let findEnum: TimeType = null;
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

export function formatDate(dateTimeNumber: number | Date, formatStr: string = "YYYY-MM-DD hh:mm.ss A"): string {
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

export function createRandomHashId(charCt: number = 7): string {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < charCt; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
