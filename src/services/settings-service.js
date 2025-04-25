import { defaultSettings } from '../constants/settings.js';

const getContext = SillyTavern.getContext;
const extensionSettings = getContext().extensionSettings;
const saveSettingsDebounced = getContext().saveSettingsDebounced;

/**
 * Initializes the settings for the extension
 *
 * @returns {Object} - The current settings
 */
export async function initializeSettings() {
    // Create the settings if they don't exist
    extensionSettings.acm = extensionSettings.acm || {};

    // Add default settings for any missing keys
    for (const key in defaultSettings) {
        if (!extensionSettings.acm.hasOwnProperty(key)) {
            extensionSettings.acm[key] = defaultSettings[key];
        }
    }
    return extensionSettings.acm;
}

/**
 * Updates a specific setting
 *
 * @param {string} key - The setting key to update
 * @param {any} value - The new value for the setting
 */
export function updateSetting(key, value) {
    if (extensionSettings.acm.hasOwnProperty(key)) {
        extensionSettings.acm[key] = value;
        saveSettingsDebounced();
    }
}

/**
 * Gets the current value of a setting
 *
 * @param {string} key - The setting key to get
 * @returns {any} - The current value of the setting
 */
export function getSetting(key) {
    return extensionSettings.acm[key];
}

/**
 * Resets all settings to their default values
 */
export function resetSettings() {
    extensionSettings.acm = { ...defaultSettings };
    saveSettingsDebounced();
}
