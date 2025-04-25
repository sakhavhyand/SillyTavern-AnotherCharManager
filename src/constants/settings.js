// Default settings for the extension
const extensionName = 'SillyTavern-AnotherCharManager';
const oldExtensionName = 'SillyTavern-AnotherTagManager';
export const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
export const oldExtensionFolderPath = `scripts/extensions/third-party/${oldExtensionName}`;

export let selectedChar;
export const setSelectedChar = (value) => {
    selectedChar = value;
};

export const tagFilterstates = new Map();

export const defaultSettings = {
    sortingField: "name",
    sortingOrder: "asc",
    favOnly: false,
    dropdownUI: false,
    dropdownMode: "allTags",
    presetId: 0,
    dropdownPresets: [
        { name: "Preset 1", categories: [] },
        { name: "Preset 2", categories: [] },
        { name: "Preset 3", categories: [] },
        { name: "Preset 4", categories: [] },
        { name: "Preset 5", categories: [] }
    ]
};
