// An extension that allows you to manage characters.
import { AppContext } from './scripts/classes/AppContext';
import { ModalManager } from './scripts/classes/ModalManager';

export const acm: AppContext = new AppContext();
const modalManager: ModalManager = new ModalManager(acm.eventManager, acm.settings, acm.st);

acm.st.eventSource.on('app_ready', async (): Promise<void> => {
    try {
        await acm.settings.init();
        acm.settings.migrateDropdownPresets();
        await modalManager.init();
    } catch (error) {
        console.error('A critical error has occurred while starting the extension:', error);
    }
});
