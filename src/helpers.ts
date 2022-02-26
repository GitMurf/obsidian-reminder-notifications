import MyPlugin from "./main";

export async function checkForReminders(plugin: MyPlugin) {
    const newDateTimeNumber = new Date().getTime();
    const myReminders = plugin.settings.reminders;
    const pastReminders = myReminders.filter(reminder => {
        if (reminder.remindNext && reminder.completed === null) {
            const nextReminder = reminder.remindNext;
            if (nextReminder < newDateTimeNumber && nextReminder > 0) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    });
    if (pastReminders.length > 0) {
        console.log("Reminders to Notify: " + pastReminders.length);
        //loop through past reminders with index
        for (let i = 0; i < pastReminders.length; i++) {
            const reminder = pastReminders[i];
            reminder.modifiedAt = newDateTimeNumber;
            reminder.remindPrev.push(reminder.remindNext);
            reminder.remindNext = reminder.remindNext + (1 * 60000);
            reminder.completed = newDateTimeNumber;
        }
        await plugin.saveSettings();
        //console.log("Reminders saved");
    }
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
