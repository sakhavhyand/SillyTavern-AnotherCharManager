import { getSetting, updateSetting} from "./settings-service.js";

/**
 * Gets a specific preset by index
 * @param {number} presetIndex - The index of the preset
 * @returns {Object} - The preset object
 */
export function getPreset(presetIndex) {
    if (presetIndex < 0 || presetIndex >= getSetting('dropdownPresets').length) {
        throw new Error('Invalid preset index');
    }
    return {...getSetting('dropdownPresets')[presetIndex]};
}

/**
 * Gets a specific category from a preset
 * @param {number} presetIndex - The index of the preset
 * @param {number} categoryIndex - The index of the category
 * @returns {Object} - The category object
 */
export function getCategory(presetIndex, categoryIndex) {
    const preset = getPreset(presetIndex);
    if (categoryIndex < 0 || categoryIndex >= preset.categories.length) {
        throw new Error('Invalid category index');
    }
    return {...preset.categories[categoryIndex]};
}

/**
 * Updates a specific preset name
 * @param {number} presetIndex - The index of the preset to update
 * @param {string} name - The new name for the preset
 */
export function updatePresetName(presetIndex, name) {
    if (presetIndex < 0 || presetIndex >= getSetting('dropdownPresets').length) {
        throw new Error('Invalid preset index');
    }
    if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Preset name must be a non-empty string');
    }
    const updatedPresets = [...getSetting('dropdownPresets')];
    updatedPresets[presetIndex] = {
        ...updatedPresets[presetIndex],
        name: name
    };
    updateSetting('dropdownPresets', updatedPresets);
}

/**
 * Updates all categories of a specific preset
 * @param {number} presetIndex - The index of the preset
 * @param {Array} categories - The new array of categories
 */
export function updatePresetCategories(presetIndex, categories) {
    if (presetIndex < 0 || presetIndex >= getSetting('dropdownPresets').length) {
        throw new Error('Invalid preset index');
    }
    if (!Array.isArray(categories)) {
        throw new Error('Categories must be an array');
    }

    if (!categories.every(category =>
        typeof category === 'object' &&
        typeof category.name === 'string' &&
        Array.isArray(category.tags)
    )) {
        throw new Error('Invalid category format. Each category must have a name (string) and tags (array)');
    }

    const updatedPresets = [...getSetting('dropdownPresets')];
    updatedPresets[presetIndex] = {
        ...updatedPresets[presetIndex],
        categories: [...categories]
    };
    updateSetting('dropdownPresets', updatedPresets);
}

/**
 * Adds a new category to a preset
 * @param {number} presetIndex - The index of the preset
 * @param {string} name - The name of the new category
 */
export function addPresetCategory(presetIndex, name) {
    if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Category name must be a non-empty string');
    }
    const updatedPresets = [...getSetting('dropdownPresets')];
    updatedPresets[presetIndex] = {
        ...updatedPresets[presetIndex],
        categories: [...updatedPresets[presetIndex].categories, { name, tags: [] }]
    };
    updateSetting('dropdownPresets', updatedPresets);
}

/**
 * Updates a specific category in a preset
 * @param {number} presetIndex - The index of the preset
 * @param {number} categoryIndex - The index of the category
 * @param {string} name - The new name for the category
 */
export function updateCategoryName(presetIndex, categoryIndex, name) {
    const preset = getPreset(presetIndex);
    if (categoryIndex < 0 || categoryIndex >= preset.categories.length) {
        throw new Error('Invalid category index');
    }
    if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Category name must be a non-empty string');
    }

    const updatedPresets = [...getSetting('dropdownPresets')];
    updatedPresets[presetIndex].categories[categoryIndex] = {
        ...updatedPresets[presetIndex].categories[categoryIndex],
        name
    };
    updateSetting('dropdownPresets', updatedPresets);
}

/**
 * Removes a category from a preset
 * @param {number} presetIndex - The index of the preset
 * @param {number} categoryIndex - The index of the category to remove
 */
export function removePresetCategory(presetIndex, categoryIndex) {
    const preset = getPreset(presetIndex);
    if (categoryIndex < 0 || categoryIndex >= preset.categories.length) {
        throw new Error('Invalid category index');
    }

    const updatedPresets = [...getSetting('dropdownPresets')];
    updatedPresets[presetIndex].categories = updatedPresets[presetIndex].categories
        .filter((_, index) => index !== categoryIndex);
    updateSetting('dropdownPresets', updatedPresets);
}

/**
 * Adds a tag to a category
 * @param {number} presetIndex - The index of the preset
 * @param {number} categoryIndex - The index of the category
 * @param {number} tagId - The ID of the tag to add
 */
export function addTagToCategory(presetIndex, categoryIndex, tagId) {
    const category = getCategory(presetIndex, categoryIndex);
    if (category.tags.includes(tagId)) {
        return; // Tag already exists in category
    }

    const updatedPresets = [...getSetting('dropdownPresets')];
    updatedPresets[presetIndex].categories[categoryIndex].tags.push(tagId);
    updateSetting('dropdownPresets', updatedPresets);
}

/**
 * Removes a tag from a category
 * @param {number} presetIndex - The index of the preset
 * @param {number} categoryIndex - The index of the category
 * @param {number} tagId - The ID of the tag to remove
 */
export function removeTagFromCategory(presetIndex, categoryIndex, tagId) {
    const updatedPresets = [...getSetting('dropdownPresets')];
    updatedPresets[presetIndex].categories[categoryIndex].tags =
        updatedPresets[presetIndex].categories[categoryIndex].tags
            .filter(id => id !== tagId);
    updateSetting('dropdownPresets', updatedPresets);
}
