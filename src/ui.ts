import { App, Modal, Plugin, SuggestModal } from 'obsidian';

export class inputModal extends SuggestModal<string> {
    options: string[] = [];
    firstSet: string[] = ['minutes BLAH', 'hours', 'days', 'weeks', 'months'];
    secondSet: string[] = ['one', 'two', 'three', 'four'];
    thirdSet: string[] = ['blue', 'red', 'green', 'orange'];

    constructor(app: App, private thisPlugin: Plugin, private modalType: string) {
        super(app);
        /*
            this.setPlaceholder("Enter any keyword(s) to filter by plain text search...");
            this.setInstructions([
                { command: 'Plain Text: ', purpose: 'No [[Page]] or #Tag required' },
            ]);
            this.limit = 5;
        */
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

    onOpen() {
        super.onOpen();
        this.lightenBackground();
    }

    lightenBackground() {
        let modalBg: HTMLElement = this.containerEl.querySelector('.modal-bg');
        if (modalBg) {
            modalBg.style.backgroundColor = '#00000029';
        }
        this.modalEl.style.border = '4px solid #483699';
    }

    getSuggestions(query: string): string[] {
        return this.options.filter(option => option.toLowerCase().includes(query.toLowerCase()));
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
        console.log(item);
        this.close();
    }

    onClose(): void {
        if (this.modalType) {
            const modalSelect = new inputModal(this.app, this.thisPlugin, this.modalType);
            modalSelect.open();
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