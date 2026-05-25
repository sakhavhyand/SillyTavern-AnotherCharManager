// An extension that allows you to manage characters.
import { AppContext } from './scripts/classes/AppContext.js';
import { ModalManager } from './scripts/classes/ModalManager.js';

export const acm = new AppContext();
const modalManager = new ModalManager(acm.eventManager, acm.settings, acm.st);

jQuery(async () => {
    await acm.settings.init();
    acm.settings.migrateDropdownPresets();
    await modalManager.init();
});
