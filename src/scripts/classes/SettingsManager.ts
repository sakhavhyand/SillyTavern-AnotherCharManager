import {
    EXTENSION_NAME,
    OLD_EXTENSION_NAME,
    defaultSettings,
    create_data as defaultCreateData,
    ExtensionSettings,
    CreateData,
} from '../settings';

interface SettingsManagerParams {
    extensionSettings: any;
    saveSettingsDebounced: (...args: any[]) => void;
}

export class SettingsManager {
    extensionSettings: any;
    saveSettingsDebounced: (...args: any[]) => void;
    default: Readonly<ExtensionSettings>;
    create_data: CreateData;
    extensionName: string;
    oldExtensionName: string;
    selectedChar: string | undefined;
    searchValue: string;
    mem_menu: any;
    mem_avatar: any;
    acm_crop_data: any;

    constructor({ extensionSettings, saveSettingsDebounced }: SettingsManagerParams) {
        this.extensionSettings = extensionSettings;
        this.saveSettingsDebounced = saveSettingsDebounced;

        this.default = defaultSettings;
        this.create_data = structuredClone(defaultCreateData) as CreateData;

        this.extensionName = EXTENSION_NAME;
        this.oldExtensionName = OLD_EXTENSION_NAME;

        this.selectedChar = undefined;
        this.searchValue = '';
        this.mem_menu = undefined;
        this.mem_avatar = undefined;
        this.acm_crop_data = undefined;
    }

    async init(): Promise<void> {
        // Create the settings if they don't exist
        this.extensionSettings.acm = this.extensionSettings.acm || {};

        // Add default settings for any missing keys
        for (const key in this.default) {
            if (!Object.prototype.hasOwnProperty.call(this.extensionSettings.acm, key)) {
                this.extensionSettings.acm[key] = (this.default as any)[key];
            }
        }
    }

    setSelectedChar(char: any): void {
        this.selectedChar = char;
    }

    setSearchValue(value: string): void {
        this.searchValue = value;
    }

    setMem_menu(value: any): void {
        this.mem_menu = value;
    }

    setMem_avatar(value: any): void {
        this.mem_avatar = value;
    }

    setCrop_data(value: any): void {
        this.acm_crop_data = value;
    }

    getSetting(key: string): any {
        return this.extensionSettings.acm![key];
    }

    updateSetting(key: string, value: any): void {
        if (Object.prototype.hasOwnProperty.call(this.extensionSettings.acm, key)) {
            this.extensionSettings.acm![key] = value;
            this.saveSettingsDebounced();
        }
    }

    updateCreateData(field: string, value: any): void {
        if (Object.prototype.hasOwnProperty.call(this.create_data, field)) {
            (this.create_data as any)[field] = value;
        }
    }

    resetCreateData(): void {
        this.create_data = structuredClone(defaultCreateData) as CreateData;
    }

    resetSettings(): void {
        this.extensionSettings.acm = { ...this.default };
        this.saveSettingsDebounced();
    }

    migrateDropdownPresets(): void {
        if (!Array.isArray(this.extensionSettings.acm!.dropdownPresets)) {
            return;
        }

        let hasChanges = false;

        this.extensionSettings.acm!.dropdownPresets.forEach((preset: any) => {
            if (Array.isArray(preset.categories)) {
                preset.categories.forEach((category: any) => {
                    if (Array.isArray(category.members) && !category.tags) {
                        category.tags = category.members;
                        delete category.members;
                        hasChanges = true;
                    }
                });
            }
        });

        if (hasChanges) {
            this.saveSettingsDebounced();
        }
    }
}
