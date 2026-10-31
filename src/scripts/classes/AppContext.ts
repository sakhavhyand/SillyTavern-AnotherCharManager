import { SettingsManager } from './SettingsManager';
import { EventManager } from './EventManager';
import { SillyTavernContext } from './SillyTavernContext';

export class AppContext {
    eventManager: EventManager;
    st: SillyTavernContext;
    settings: SettingsManager;

    constructor() {
        this.eventManager = new EventManager();
        this.st = new SillyTavernContext();
        this.settings = new SettingsManager({
            extensionSettings: this.st.extensionSettings,
            saveSettingsDebounced: (...args: any[]) =>
                this.st.saveSettingsDebounced(...args),
        });
    }
}
