// An extension that allows you to manage characters.
import { AppContext } from './scripts/classes/AppContext.js';
import { ModalManager } from './scripts/classes/ModalManager.js';

export const acm: AppContext = new AppContext();
const modalManager: ModalManager = new ModalManager(acm.eventManager, acm.settings, acm.st);
console.log("BeforeListener");

acm.st.eventSource.on('app_ready', async (): Promise<void> => {
    console.log("InsideListener");
    try {
        await acm.settings.init();
        acm.settings.migrateDropdownPresets();
        await modalManager.init();
    } catch (error) {
        console.error('A critical error has occurred while starting the extension:', error);
    }
});
