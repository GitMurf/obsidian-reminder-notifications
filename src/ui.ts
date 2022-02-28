import { App, Modal, SuggestModal } from 'obsidian';
import { addTime, formatDate, getTimeDurationString, getTimeTypeEnumFromString, getTimeTypeString } from './helpers';
import MyPlugin from './main';
import { Reminder, TimeType } from './types';

class optionsModal extends SuggestModal<string> {
    options: string[] = [];
    selectedItem: string;

    constructor(app: App, private optionsArr: string[]) {
        super(app);
        this.emptyStateText = 'No matches found';
        this.options = this.optionsArr;
    }

    onOpen() {
        super.onOpen();
        this.lightenBackground();
    }

    getSuggestions(query: string): string[] {
        if (this.options) {
            return this.options.filter(option => option.toLowerCase().includes(query.toLowerCase()));
        } else {
            this.close();
        }
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
        this.selectedItem = item;
        this.close();
    }

    lightenBackground() {
        let modalBg: HTMLElement = this.containerEl.querySelector('.modal-bg');
        if (modalBg) {
            modalBg.style.backgroundColor = '#00000029';
        }
        this.modalEl.style.border = '4px solid #483699';
    }
}

export class newReminderModals extends optionsModal {
    constructor(app: App, private thisPlugin: MyPlugin, private modalType: number = 1) {
        super(app, []);
        this.options = this.getModalOptions(this.modalType);
        this.modalType++;
    }

    getModalOptions(modalType: number): string[] {
        let modalOptions: string[] = null;
        switch (modalType) {
            case 1:
                modalOptions = ['Reminder number one', 'Reminder number two', 'Reminder number three'];
                break;
            case 2:
                modalOptions = [getTimeTypeString(TimeType.minutes), getTimeTypeString(TimeType.hours), getTimeTypeString(TimeType.days), getTimeTypeString(TimeType.weeks), getTimeTypeString(TimeType.months), getTimeTypeString(TimeType.quarters), getTimeTypeString(TimeType.years)];
                break;
            case 3:
                const prevItem = this.thisPlugin.modalResponse[this.thisPlugin.modalResponse.length - 1];
                switch (prevItem) {
                    case 'minutes':
                        modalOptions = ['1', '2', '15', '30', '45', '60'];
                        break;
                    case 'hours':
                        modalOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']
                        break;
                    case 'days':
                        modalOptions = ['1', '2', '3', '4', '5', '6', '7'];
                        break;
                    case 'weeks':
                        modalOptions = ['1', '2', '3', '4'];
                        break;
                    case 'months':
                        modalOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
                        break;
                    case 'years':
                        modalOptions = ['1', '2', '3', '4'];
                        break;
                }
                break;
        }
        return modalOptions;
    }

    async createReminderFromModals(modalResponse: string[]) {
        const dtReminder = new Date();
        const dtTimeUID = dtReminder.getTime();
        const timeTypeEnum = getTimeTypeEnumFromString(modalResponse[1]);
        const howLong = Number(modalResponse[2]);
        let nextReminder;
        if (timeTypeEnum === TimeType.minutes && howLong == 2) {
            nextReminder = addTime(dtTimeUID, TimeType.seconds, 5);
        } else {
            nextReminder = addTime(dtTimeUID, timeTypeEnum, howLong);
        }
        const remindTitle = modalResponse[0];
        const remindContent = remindTitle;

        let reminder: Reminder = {
            id: dtTimeUID,
            createdAt: dtTimeUID,
            modifiedAt: dtTimeUID,
            title: remindTitle,
            content: remindContent,
            remindNext: nextReminder,
            remindPrev: [],
            recurring: null,
            remind: [],
            completed: null,
            seen: [],
            notes: `[${this.thisPlugin.deviceId}] Created reminder at ${formatDate(dtTimeUID)}\nNext reminder in ${getTimeDurationString(howLong, timeTypeEnum)} at ${formatDate(nextReminder)}`,
        };
        console.log(reminder.notes);
        this.thisPlugin.settings.reminders.push(reminder);
        this.thisPlugin.settings.lastUpdated = dtTimeUID;
        await this.thisPlugin.saveSettings();
        //console.log("Reminder created and saved");
        console.log(reminder);
    }

    onClose(): void {
        super.onClose();
        if (this.selectedItem) {
            this.thisPlugin.modalResponse.push(this.selectedItem);
            if (this.getModalOptions(this.modalType) !== null) {
                const modalSelect = new newReminderModals(this.app, this.thisPlugin, this.modalType);
                modalSelect.open();
            } else {
                //All modals have been responded to, now we can create the reminder
                this.createReminderFromModals(this.thisPlugin.modalResponse);
            }
        }
    }
}

export class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}




















/*
export class timeModal extends optionsModal {
    options: string[] = [];
    firstSet: string[] = ['minutes BLAH', 'hours', 'days', 'weeks', 'months'];
    secondSet: string[] = ['one', 'two', 'three', 'four'];
    thirdSet: string[] = ['blue', 'red', 'green', 'orange'];

    constructor(app: App, private thisPlugin: MyPlugin, private modalType: string[]) {
        super(app, modalType);
        this.setPlaceholder("Enter any keyword(s) to filter by plain text search...");
        this.setInstructions([
            { command: 'Plain Text: ', purpose: 'No [[Page]] or #Tag required' },
        ]);
        this.limit = 5;
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

    onClose(): void {
        if (this.modalType) {
            const modalSelect = new inputModal(this.app, this.thisPlugin, this.modalType);
            modalSelect.open();
        }
    }
}
*/