import { App, ItemView, Modal, nldPlugin, Notice, setIcon, SuggestModal, WorkspaceLeaf } from 'obsidian';
import { addTime, checkForReminders, formatDate, getTimeDurationString, getTimeTypeEnumFromString, getTimeTypeString, isViewActive, reminderDelete, reminderSetPropById, sleepDelay } from './helpers';
import MyPlugin, { VIEW_ICON, VIEW_TYPE } from './main';
import { Reminder, TimeType } from './types';

export class ReminderNotificationsView extends ItemView {
    constructor(private plugin: MyPlugin, leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE;
    }

    getDisplayText(): string {
        //The text that appears when you hover the view icon
        return "Reminder Notifications";
    }

    getIcon(): string {
        return VIEW_ICON;
    }

    setupNavButtonCont(parEl: HTMLElement): HTMLDivElement {
        const navHeader = parEl.createDiv("nav-header");
        const navButContainer = navHeader.createDiv("nav-buttons-container");
        return navButContainer;
    }

    addNavButton(navButContainer: HTMLDivElement, tooltip: string, icon: string, size: number = 20): HTMLDivElement {
        let myButton = navButContainer.createDiv("nav-action-button");
        myButton.ariaLabel = tooltip;
        setIcon(myButton, icon, size);
        return myButton;
    }

    addBacklinksDefaultNavButtons(navButContainer: HTMLDivElement): void {
        let myButton = navButContainer.createDiv("nav-action-button");
        myButton.ariaLabel = "Collapse results";
        setIcon(myButton, "bullet-list", 20);

        myButton.addEventListener("click", (evt) => {
            const targetEl = evt.target as HTMLDivElement;
            let isCollapsed = true;
            if (targetEl.classList.contains("is-active")) {
                isCollapsed = false;
                targetEl.removeClass("is-active");
            } else {
                isCollapsed = true;
                targetEl.addClass("is-active");
            }
            const childrenReminders = Array.from(document.querySelectorAll(".view-content.rem-notifications-view .main .tree-item.search-result")) as HTMLDivElement[];
            childrenReminders.forEach((reminder) => {
                if (reminder.classList.contains("is-collapsed")) {
                    if (!isCollapsed) {
                        reminder.removeClass("is-collapsed");
                        reminderSetPropById(this.plugin, parseInt(reminder.id), "collapsed", false);
                    }
                } else {
                    if (isCollapsed) {
                        reminder.addClass("is-collapsed");
                        reminderSetPropById(this.plugin, parseInt(reminder.id), "collapsed", true);
                    }
                }
            });
        });
        /*
        myButton = navButContainer.createDiv("nav-action-button");
        myButton.ariaLabel = "Show more context";
        setIcon(myButton, "expand-vertically", 20);
        myButton = navButContainer.createDiv("nav-action-button");
        myButton.ariaLabel = "Change sort order";
        setIcon(myButton, "up-and-down-arrows", 20);
        myButton = navButContainer.createDiv("nav-action-button");
        myButton.ariaLabel = "Show search filter";
        setIcon(myButton, "magnifying-glass", 20);
        */
    }

    setupCollapsableResults(parEl: HTMLElement): HTMLDivElement {
        const mainHeader = parEl.createDiv("search-result-container mod-global-search node-insert-event");
        const resChildren = mainHeader.createDiv("search-results-children");
        return resChildren;
    }

    getDateTimeFormat(dateTime: Date | number): string {
        let dateFormat = "MMM Do [at] h:mm A";
        const targetDay = window.moment(dateTime).date();
        const todDay = window.moment().date();
        const dayDiff = targetDay - todDay;
        switch (dayDiff) {
            case 0:
                dateFormat = "h:mm A";
                break;
            case -1:
                dateFormat = "[Yesterday at] h:mm A";
                break;
            case -2:
                dateFormat = "dddd [at] h:mm A";
                break;
            case -3:
                dateFormat = "dddd [at] h:mm A";
                break;
            case 1:
                dateFormat = "[Tomorrow at] h:mm A";
                break;
            case 2:
                dateFormat = "dddd [at] h:mm A";
                break;
            case 3:
                dateFormat = "dddd [at] h:mm A";
                break;
            default:
                dateFormat = "MMM Do [at] h:mm A";
                break;
        }
        return dateFormat;
    }

    addCollapsableResult(resultChildren: HTMLDivElement, result: { id: number, title: string, created: number, reminder: number, collapsed: boolean }): HTMLDivElement | null {
        const timeRemaining = result.reminder - new Date().getTime();
        const momDiff = window.moment.duration(timeRemaining);
        let timeString = "";
        let days = 0;
        let hours = 0;
        let minutes = 0;
        let seconds = 0;
        if (timeRemaining > 0) {
            days = Math.floor(momDiff.asDays());
            if (days > 0) {
                timeString = `${days}d `;
            }
            hours = Math.floor(momDiff.asHours()) - (days * 24);
            if (hours > 0) {
                timeString += `${hours}h `;
            }
            minutes = Math.floor(momDiff.asMinutes()) - (days * 24 * 60) - (hours * 60);
            if (minutes > 0) {
                timeString += `${minutes}m `;
            }
            seconds = Math.floor(momDiff.asSeconds()) - (days * 24 * 60 * 60) - (hours * 60 * 60) - (minutes * 60);
            if (seconds > 0) {
                timeString += `${Math.floor(seconds)}s`;
            }
        }
        if(timeString === "") { return null }
        const eachChild = resultChildren.createDiv({ cls: "tree-item search-result", attr: { "id": result.id } });
        if (result.collapsed) {
            eachChild.addClass("is-collapsed");
        }
        const childTitle = eachChild.createDiv("tree-item-self search-result-file-title is-clickable");
        const collapseIcon = childTitle.createDiv("tree-item-icon collapse-icon");
        setIcon(collapseIcon, "right-triangle", 8);
        childTitle.onclick = () => {
            eachChild.classList.toggle("is-collapsed");
            if(eachChild.classList.contains("is-collapsed")) {
                reminderSetPropById(this.plugin, result.id, "collapsed", true);
            } else {
                reminderSetPropById(this.plugin, result.id, "collapsed", false);
            }
        }
        const treeInner = childTitle.createDiv({ cls: "tree-item-inner", text: result.title });
        const treeOuter = childTitle.createDiv("tree-item-flair-outer");
        const treeFlair = treeOuter.createSpan({ cls: "tree-item-flair", text: timeString });
        const deleteButton = treeOuter.createSpan({ cls: "tree-item-delete icon-container" });
        setIcon(deleteButton, "trash-2", 15);
        deleteButton.onclick = async () => {
            await reminderDelete(this.plugin, result.id);
            await checkForReminders(this.plugin, this.plugin.myInterval, true);
            console.log(`Deleted reminder with ID: ${result.id} and title: ${result.title}`);
        }
        if (timeRemaining < (1000 * 60 * 15)) {
            treeFlair.addClass("expiring-soon");
        }
        const childMatch = eachChild.createDiv("search-result-file-matches");
        //Reminder time span element
        let eachMatch = childMatch.createDiv("search-result-file-match");
        if (eachMatch) {
            const iconSpan = eachMatch.createSpan({ cls: "icon-container" });
            setIcon(iconSpan, "bell", 15);
            let dateFormat = this.getDateTimeFormat(result.reminder);
            if (days < 1 && hours < 1 && minutes < 1 && seconds > 0) {
                dateFormat = `[${seconds} seconds at] ${dateFormat}`;
            } else if (days < 1 && hours < 1 && minutes > 0) {
                //dateFormat = `${dateFormat} [in ${minutes} minutes]`;
                dateFormat = minutes > 1 ? `[${minutes} minutes at] ${dateFormat}` : `[${minutes} minute at] ${dateFormat}`;
            } else if (days < 1 && hours === 1) {
                //dateFormat = `${dateFormat} [in ${minutes} minutes]`;
                dateFormat = `[Next Hour at] ${dateFormat}`;
            }
            eachMatch.createSpan({ text: `${formatDate(result.reminder, dateFormat)}` });
        }
        //Creation time span element
        eachMatch = childMatch.createDiv("search-result-file-match");
        if (eachMatch) {
            const iconSpan = eachMatch.createSpan({ cls: "icon-container" });
            setIcon(iconSpan, "clock", 15);
            let dateFormat = this.getDateTimeFormat(result.created);
            let createdString = "Created on";
            if (dateFormat.indexOf("at]") < 0) {
                createdString = `Created Today at`;
            } else if (dateFormat.toLowerCase().indexOf("yesterday") > 0) {
                createdString = `Created`;
            }
            eachMatch.createSpan({ text: `${createdString} ${formatDate(result.created, dateFormat)}` });
        }
        return eachChild;
    }

    async onClose(): Promise<void> {
        await super.onClose();
    }

    async onOpen(): Promise<void> {
        //Add click event to the view leaf itself for when switching between views in sidebar
        this.plugin.registerDomEvent(this.leaf.tabHeaderEl, "click", async () => {
            await sleepDelay(this.plugin, .05);
            if (isViewActive(this.plugin)) {
                checkForReminders(this.plugin, this.plugin.myInterval, true);
            }
        });
        //Empty the view to start
        this.contentEl.empty();
        this.contentEl.addClass("rem-notifications-view");
        const mainDiv = this.contentEl.createDiv("main");
        //mainDiv.createEl("h2", { cls: "test-class", text: "Reminder Notifications" });
        const navButCont = this.setupNavButtonCont(mainDiv);
        this.addBacklinksDefaultNavButtons(navButCont);
        this.setupCollapsableResults(mainDiv);
        await super.onOpen();
    }
}

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
    constructor(title: string, dateTime: number | Date, seconds: number = 10) {
        let milliseconds: number = seconds * 1000;
        let newDocFrag = createFragment();
        let dateString = formatDate(dateTime, "hh:mm A [on] MMM Do");
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
        this.noticeEl.addClass("reminder-notice");

        //NOTE: The notification notice in Obsidian will actually never close because I turned off the native "hide()" method
            //This will auto close the notice after the specified time with my own setTimeout().
            //Replaces Obsidian core method since the native hide() method is turned off
        setTimeout(() => this.closeNotice(), milliseconds);
    }

    hide(): void {
        //Do nothing... prevents closing on click, other than close button
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
                const nlDatesPlugin: nldPlugin = this.thisPlugin.app.plugins.getPlugin('nldates-obsidian') as nldPlugin;
                if (nlDatesPlugin) {
                    const nlDate = nlDatesPlugin.parseDate(newString);
                    if (nlDate.formattedString !== 'Invalid date') {
                        nextReminder = nlDate.date.getTime();
                    } else {
                        new Notice(`Invalid date: ${newString}`, 10000);
                        return;
                    }
                } else {
                    nextReminder = window.moment(newString, "hh:mm A").valueOf();
                }
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
            collapsed: false,
        };
        console.log(reminder.notes);
        this.thisPlugin.settings.reminders.push(reminder);
        this.thisPlugin.settings.lastUpdated = dtTimeUID;
        await this.thisPlugin.saveSettings();
        //console.log("Reminder created and saved");
        console.log(reminder);
        await checkForReminders(this.thisPlugin, this.thisPlugin.myInterval, true);
    }
}
