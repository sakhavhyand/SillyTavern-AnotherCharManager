import { SettingsManager } from './SettingsManager.js';
import { EventManager } from './EventManager.js';
import { SillyTavernContext } from './SillyTavernContext.js';

export class AppContext {
    constructor() {
        this.eventManager = new EventManager();
        this.st = new SillyTavernContext();
        this.settings = new SettingsManager({
            extensionSettings: this.st.extensionSettings,
            saveSettingsDebounced: (...args) =>
                this.st.saveSettingsDebounced(...args)
        });
    }
}
