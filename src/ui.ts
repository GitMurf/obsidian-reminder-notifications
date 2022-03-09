import { App, Modal, Notice, Plugin_2, setIcon, SuggestModal } from 'obsidian';
import { addTime, formatDate, getTimeDurationString, getTimeTypeEnumFromString, getTimeTypeString } from './helpers';
import MyPlugin from './main';
import { Reminder, TimeType } from './types';

export class InputModal extends Modal {
    constructor(private plugin: MyPlugin) {
        super(plugin.app);
    }

    onOpen() {
        this.contentEl.empty();
        this.containerEl.addClass('reminder-input-modal');
        this.titleEl.setText('New Reminder');
        const inputEl = this.contentEl.createEl(
            'input',
            {
                type: 'text',
                value: '',
                attr: {
                    placeholder: 'Add a reminder note...'
                }
            }
        );
        inputEl.focus();
        //inputEl.select();
        const createButtonEl = this.contentEl.createEl('button', { text: 'Create' });

        inputEl.addEventListener('keyup', (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                createButtonEl.click();
            }
        });

        this.plugin.modalResponse[0] = '';
        createButtonEl.addEventListener('click', () => {
            this.close();
            this.plugin.modalResponse[0] = inputEl.value;
            if (inputEl.value === '') {
                console.log(`Closed the modal input without a response... EXITING!`);
            } else {
                new NewReminderModals(this.plugin).open();
            }
        });
    }

    onClose() {
        super.onClose();
        this.contentEl.empty();
    }
}

export class ReminderNotice extends Notice {
    constructor(title: string, dateTime: number | Date, seconds?: number) {
        let milliseconds: number | undefined = undefined;
        let newDocFrag = createFragment();
        let dateString = formatDate(dateTime, "hh:mm A [on] MMM Do");

        if (seconds) {
            milliseconds = seconds * 1000;
        }
        let newDivPar = newDocFrag.createDiv();
        let spanParDiv = newDivPar.createDiv();
        let newSpan1 = spanParDiv.createSpan();
        spanParDiv.createEl("br");
        let newSpan2 = spanParDiv.createSpan();
        spanParDiv.createEl("br");
        spanParDiv.createEl("br");
        let buttonParDiv = newDivPar.createDiv();
        let newButton1 = buttonParDiv.createEl("button");
        let newButton2 = buttonParDiv.createEl("button");

        super(newDocFrag, milliseconds);

        newSpan1.setText(title);
        newSpan1.style.fontWeight = "bold";
        newSpan2.setText(dateString);
        newButton1.setText("Snooze");
        newButton1.onClickEvent(() => {
            console.log("Snooze button clicked");
        });
        newButton2.setText("Close");
        newButton2.onClickEvent(() => {
            console.log("Close button clicked");
            this.closeNotice();
        });
        this.noticeEl.style.maxWidth = "unset";
        this.noticeEl.style.cursor = "unset";
    }

    hide(): void {
        //Do nothing... prevents closing on click other than close button
    }

    closeNotice(): void {
        super.hide();
    }
}

class OptionsModal extends SuggestModal<string> {
    options: string[] = [];
    selectedItem: string = "";

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
        return [];
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
        let modalBg: HTMLElement = this.containerEl.querySelector('.modal-bg') as HTMLElement;
        if (modalBg) {
            modalBg.style.backgroundColor = '#00000029';
        }
        this.modalEl.style.border = '4px solid #483699';
    }
}

class NewReminderModals extends OptionsModal {
    constructor(private thisPlugin: MyPlugin, private modalType: number = 1) {
        super(thisPlugin.app, []);
        this.options = this.getModalOptions(this.modalType);
        this.modalType++;
    }

    getSuggestions(query: string): string[] {
        const options = super.getSuggestions(query);
        if (options.length > 0) {
            return options;
        } else {
            return [`${query} ⏰`];
        }
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        let addingIcon = null;
        let textValue = "";
        if (value.startsWith('icon:')) {
            const splitPipe = value.split('|');
            const splitColon = splitPipe[0].split(':');
            if (splitColon[0] === 'icon' && splitColon[1]) {
                addingIcon = splitColon[1];
                splitPipe.shift();
                textValue = splitPipe.join('|');
            }
        }
        if (addingIcon) {
            const iconSpan = el.createSpan('modal-icon');
            setIcon(iconSpan, addingIcon);
            const textSpan = el.createSpan('modal-text');
            textSpan.innerText = textValue;
        } else {
            el.innerText = value;
        }
    }

    onChooseSuggestion(item: string, _: MouseEvent | KeyboardEvent): void {
        super.onChooseSuggestion(item, _);
        if (this.selectedItem) {
            this.thisPlugin.modalResponse.push(this.selectedItem);
            if (this.getModalOptions(this.modalType).length > 0) {
                new NewReminderModals(this.thisPlugin, this.modalType).open();
            } else {
                //All modals have been responded to, now we can create the reminder
                this.createReminderFromModals(this.thisPlugin.modalResponse);
            }
        }
    }

    getModalOptions(modalType: number): string[] {
        let modalOptions: string[] = [];
        switch (modalType) {
            case 1:
                modalOptions = ["Exact Time", getTimeTypeString(TimeType.minutes), getTimeTypeString(TimeType.hours), getTimeTypeString(TimeType.days), getTimeTypeString(TimeType.weeks), getTimeTypeString(TimeType.months), getTimeTypeString(TimeType.quarters), getTimeTypeString(TimeType.years)];
                break;
            case 2:
                const prevItem = this.thisPlugin.modalResponse[this.thisPlugin.modalResponse.length - 1];
                switch (prevItem) {
                    case 'Exact Time':
                        const curTime = new Date();
                        const curHour = curTime.getHours();
                        const curMinute = curTime.getMinutes();
                        const curDay = curTime.getDate();
                        const curMonth = curTime.getMonth();
                        const curYear = curTime.getFullYear();

                        let myDateOpt = new Date();
                        if (curMinute < 24) {
                            myDateOpt.setMinutes(25);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                        }

                        myDateOpt = new Date();
                        if (curMinute < 54) {
                            myDateOpt.setMinutes(55);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                        }

                        myDateOpt = new Date();
                        if (curMinute < 10) {
                            myDateOpt.setMinutes(15);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                            myDateOpt.setMinutes(30);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                            myDateOpt.setMinutes(45);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                            myDateOpt.setMinutes(0);
                            myDateOpt.setHours(curHour + 1);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                        } else if (curMinute < 25) {
                            myDateOpt.setMinutes(30);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                            myDateOpt.setMinutes(45);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                            myDateOpt.setMinutes(0);
                            myDateOpt.setHours(curHour + 1);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                        } else if (curMinute < 40) {
                            myDateOpt.setMinutes(45);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                            myDateOpt.setMinutes(0);
                            myDateOpt.setHours(curHour + 1);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                        } else if (curMinute < 55) {
                            myDateOpt.setMinutes(0);
                            myDateOpt.setHours(curHour + 1);
                            modalOptions.push(formatDate(myDateOpt, "[Today at] hh:mm A"));
                        }

                        myDateOpt = new Date();
                        myDateOpt.setMinutes(0);
                        myDateOpt.setHours(8);
                        myDateOpt.setDate(curDay + 1);
                        modalOptions.push(formatDate(myDateOpt, "MMM Do (ddd) [at] hh:mm A"));

                        myDateOpt = new Date();
                        myDateOpt.setMinutes(0);
                        myDateOpt.setHours(9);
                        myDateOpt.setDate(curDay + 1);
                        modalOptions.push(formatDate(myDateOpt, "MMM Do (ddd) [at] hh:mm A"));

                        myDateOpt = new Date();
                        myDateOpt.setMinutes(0);
                        myDateOpt.setHours(10);
                        myDateOpt.setDate(curDay + 1);
                        modalOptions.push(formatDate(myDateOpt, "MMM Do (ddd) [at] hh:mm A"));

                        myDateOpt = new Date();
                        myDateOpt.setMinutes(0);
                        myDateOpt.setDate(curDay + 1);
                        modalOptions.push(formatDate(myDateOpt, "MMM Do (ddd) [at] hh:mm A"));

                        break;
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
        let nextReminder: number;
        let myNote = "";

        if (modalResponse[1] !== 'Exact Time') {
            const timeTypeEnum = getTimeTypeEnumFromString(modalResponse[1]);
            const howLong = Number(modalResponse[2]);
            if (timeTypeEnum === TimeType.minutes && howLong == 2) {
                nextReminder = addTime(dtTimeUID, TimeType.seconds, 5);
            } else {
                nextReminder = addTime(dtTimeUID, timeTypeEnum, howLong);
            }
            myNote = ` in ${getTimeDurationString(howLong, timeTypeEnum)}`;
        } else {
            if (modalResponse[2].indexOf("⏰") > -1) {
                const newString = modalResponse[2].replace("⏰", "").trim();
                nextReminder = window.moment(newString, "hh:mm A").valueOf();
            } else if (modalResponse[2].indexOf("Today at") > -1) {
                nextReminder = window.moment(modalResponse[2], "[Today at] hh:mm A").valueOf();
            } else {
                nextReminder = window.moment(modalResponse[2], "MMM Do (ddd) [at] hh:mm A").valueOf();
            }
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
            completed: 0,
            seen: [],
            notes: `[${this.thisPlugin.deviceId}] Created reminder at ${formatDate(dtTimeUID)}\nNext reminder${myNote} at ${formatDate(nextReminder)}`,
        };
        console.log(reminder.notes);
        this.thisPlugin.settings.reminders.push(reminder);
        this.thisPlugin.settings.lastUpdated = dtTimeUID;
        await this.thisPlugin.saveSettings();
        //console.log("Reminder created and saved");
        console.log(reminder);
    }
}
