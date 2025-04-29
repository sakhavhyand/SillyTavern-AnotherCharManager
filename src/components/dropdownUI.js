import { createTagInputCat, displayTag } from './tags.js';
import {
    POPUP_TYPE,
    callPopup,
    tagMap,
    tagList,
} from "../constants/context.js";
import {
    addPresetCategory,
    getPreset,
    getSetting, removePresetCategory, updateCategoryName,
    updatePresetCategories,
    updatePresetName
} from "../services/settings-service.js";
import { getCharBlock } from "./characters.js";

/**
 * Generates a dropdown HTML structure categorizing items based on tags
 * and includes a section for items without any associated tags.
 *
 * @param {Array} sortedList A sorted array of objects representing the items with `avatar` property to associate with tags.
 * @return {string} The HTML string containing the dropdown containers for each tag and a section for untagged items.
 */
export function dropdownAllTags(sortedList){
    const html = tagList.map(tag => {
        const charactersForTag = sortedList
            .filter(item => tagMap[item.avatar]?.includes(tag.id))
            .map(item => item.avatar);

        if (charactersForTag.length === 0) {
            return '';
        }

        const characterBlocks = charactersForTag.map(character => getCharBlock(character)).join('');

        return `<div class="dropdown-container">
                            <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">${tag.name} (${charactersForTag.length})</div>
                            <div class="dropdown-content character-list">
                                ${characterBlocks}
                            </div>
                        </div>`;
    }).join('');

    const noTagsCharacters = sortedList
        .filter(item => !tagMap[item.avatar] || tagMap[item.avatar].length === 0)
        .map(item => item.avatar);

    const noTagsHtml = noTagsCharacters.length > 0
        ? `<div class="dropdown-container">
                        <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">No Tags (${noTagsCharacters.length})</div>
                        <div class="dropdown-content character-list">
                            ${noTagsCharacters.map(character => getCharBlock(character)).join('')}
                        </div>
                    </div>`
        : '';

    return html + noTagsHtml;
}

/**
 * Generates a custom dropdown structure based on a sorted list and predefined categories.
 *
 * @param {Array} sortedList - An array of objects representing sorted items, where each item contains an `avatar` property.
 * @return {string} A string containing HTML elements for categorized dropdowns.
 */
export function dropdownCustom(sortedList){
    const preset = getSetting('presetId');
    const categories = getPreset(preset).categories;
    if (categories.length === 0) {
        return "Looks like our categories went on vacation! 🏖️ Check back when they're done sunbathing!";
    }
    return categories.map(category => {
        const members = category.tags;
        const charactersForCat = sortedList
            .filter(item => members.every(memberId => tagMap[item.avatar]?.includes(String(memberId))))
            .map(item => item.avatar);

        if (charactersForCat.length === 0) {
            return '';
        }

        const characterBlocks = charactersForCat.map(character => getCharBlock(character)).join('');

        return `<div class="dropdown-container">
                            <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">${category.name} (${charactersForCat.length})</div>
                            <div class="dropdown-content character-list">
                                ${characterBlocks}
                            </div>
                        </div>`;
    }).join('');
}

/**
 * Generates dropdown HTML elements grouped by creator names for the provided sorted list of items.
 *
 * @param {Array} sortedList - An array of objects representing sorted items, where each item contains an `avatar` property.
 * @return {string} A concatenated string of HTML dropdowns, where each dropdown represents a creator
 * and their associated avatars. Includes a special case for items with no creator.
 */
export function dropdownCreators(sortedList){
    return Object.entries(
        sortedList.reduce((groups, item) => {
            const creator = item.data.creator;

            if (creator) {
                if (!groups[creator]) {
                    groups[creator] = [];
                }
                groups[creator].push(item.avatar);
            } else {
                if (!groups['No Creator']) {
                    groups['No Creator'] = [];
                }
                groups['No Creator'].push(item.avatar);
            }

            return groups;
        }, {})
    ).sort(([creatorA], [creatorB]) => {
        if (creatorA === 'No Creator') return 1;
        if (creatorB === 'No Creator') return -1;
        return creatorA.localeCompare(creatorB);
    })
        .map(([creator, avatars]) => {
        if (avatars.length === 0) {
            return '';
        }

        const characterBlocks = avatars.map(character => getCharBlock(character)).join('');
        const creatorName = creator === 'No Creator' ? "No Creators" : creator;

        return `<div class="dropdown-container">
                <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">${creatorName} (${avatars.length})</div>
                <div class="dropdown-content character-list">
                    ${characterBlocks}
                </div>
            </div>`;
    }).join('');
}

/**
 * Manages the custom categories interface in the application.
 * This method creates and displays a popup allowing users to view, select, rename, or create custom categories.
 * It initializes a dropdown for preset categories, renders category controls,
 * and provides drag-and-drop reordering functionality.
 *
 * @return {Promise<void>} A Promise that resolves when the popup dialog is fully displayed and the operation is complete.
 */
export async function manageCustomCategories(){
    const html = $(document.createElement('div'));
    html.attr('id', 'acm_custom_categories');
    const selectElement = $(`
        <select id="preset_selector" title="Preset Selector"></select>
    `);
    getSetting('dropdownPresets').forEach((preset, index) => {
        selectElement.append(`<option data-preset="${index}">${preset.name}</option>`);
    });
    html.append(`
    <div class="title_restorable alignItemsBaseline">
        <h3>Custom Categories</h3>
        <div class="flex-container alignItemsBaseline">
            ${selectElement.prop('outerHTML')}
        </div>
    </div>
     <div>
        <div style="display:flex;">
             <h4 id="preset_name">${getPreset(0).name}</h4>
             <i class="menu_button fa-solid fa-edit preset_rename" title="Rename preset"></i>
        </div>
        <div class="acm_catCreate">
            <div class="menu_button menu_button_icon cat_view_create" title="Create a new category">
                <i class="fa-solid fa-plus"></i>
                <span data-i18n="Create">Create</span>
            </div>
            <small>
                Drag handle to reorder.
            </small>
        </div>
     </div>

    `);
    await callPopup(html, POPUP_TYPE.TEXT, null, {okButton: "Close", allowVerticalScrolling: true });
}

/**
 * Displays the list of categories for a specified preset ID in the user interface.
 * Handles initialization of category container, population of existing categories,
 * and rendering of components such as tags, drag handles, and action buttons.
 *
 * @param {string} presetID - The ID of the selected preset whose categories are to be displayed.
 * @param {boolean} [init=false] - Indicates whether the category container is being initialized for the first time. Defaults to `false`.
 * @return {void} This method does not return a value.
 */
export function printCategoriesList(presetID, init = false){
    const catContainer = init
        ? $('<div id="catContainer"></div>')
        : $("#catContainer").empty() && $("#catContainer");

    const preset = getPreset(presetID);
    if(preset.categories.length === 0){
        catContainer.append("No category defined");
        $('#acm_custom_categories').append(catContainer);
    }
    else {
        preset.categories.forEach((cat,index) => {
            const catHTML = `
                        <div data-catid="${index}">
                            <div class="acm_catList">
                                <div class="drag-handle ui-sortable-handle" data-i18n="[title]Drag to reorder categoies">☰</div>
                                <h4>- ${cat.name} -</h4>
                                <div style="display:flex;">
                                    <div class="menu_button fa-solid fa-edit cat_rename" title="Rename category"></div>
                                    <div class="menu_button fa-solid fa-trash cat_delete" title="Delete category"></div>
                                </div>
                            </div>
                            <div id="acm_catTagList_${index}" class="acm_catTagList"></div>
                        </div>`;
            const catElement = $(catHTML);
            const catTagList = catElement.find(`#acm_catTagList_${index}`);
            cat.tags.forEach(tag => {
                catTagList.append(displayTag(tag, true));
            });
            catTagList.append(`<label for="input_cat_tag_${index}" title="Search or create a tag.">
                                    <input id="input_cat_tag_${index}" class="text_pole tag_input wide100p margin0 ui-autocomplete-input" placeholder="Search tags" maxlength="50" autocomplete="off" style="display: none">
                                </label>`);
            catTagList.append(`<i class="fa-solid fa-plus tag addCatTag"></i>`);
            catContainer.append(catElement);
            $('#acm_custom_categories').append(catContainer);
            createTagInputCat(`#input_cat_tag_${index}`, `#acm_catTagList_${index}`, { tagOptions: { removable: true } });
        });
        makeCategoryDraggable("#catContainer");
    }
}

/**
 * Makes the categories draggable and sortable within the specified container.
 * Enables drag-and-drop functionality to change the order of categories, updating
 * the configuration and saving the new order on drop.
 *
 * @param {string} containerSelector - The selector for the container element where categories should be made draggable.
 * @return {void} No return value.
 */
function makeCategoryDraggable(containerSelector) {
    $(containerSelector).sortable({
        handle: ".drag-handle",
        items: "> div",
        tolerance: "pointer",
        placeholder: "sortable-placeholder",
        update: function () {
            const newOrder = [];
            $(containerSelector).children("div").each(function () {
                newOrder.push($(this).data("catid"));
            });
            const presetID = $('#preset_selector option:selected').data('preset');
            const currentCategories = getPreset(presetID).categories;
            updatePresetCategories(presetID, newOrder.map(index => currentCategories[index]));
        },
    });

    $(".drag-handle")
        .mousedown(function () { $(this).css("cursor", "grabbing"); })
        .mouseup(function () { $(this).css("cursor", "grab"); }
    );
}

/**
 * Renames an existing preset to a new name and updates all related UI elements.
 *
 * @param {string} preset - The identifier of the preset to rename.
 * @param {string} newName - The new name to assign to the preset.
 * @return {void}
 */
export function renamePreset(preset, newName) {
    updatePresetName(preset, newName);
    $('#preset_name').html(newName);
    $(`#preset_selector option`).filter((_, element) => $(element).data('preset') === preset).text(newName);
    updateDropdownPresetNames();
}

/**
 * Adds a new category to the specified preset and updates the dropdown presets.
 *
 * @param {string} preset - The identifier of the preset to which the category will be added.
 * @param {string} catName - The name of the new category to be added.
 * @return {void} This function does not return a value.
 */
export function addCategory(preset, catName){
    addPresetCategory(preset, catName);
    printCategoriesList(preset);
}

/**
 * Removes a category from a specified preset's category list.
 *
 * @param {string} preset - The name of the preset from which the category will be removed.
 * @param {number} category - The index of the category to remove in the preset's category list.
 * @return {void} This method does not return a value.
 */
export function removeCategory(preset, category) {
    removePresetCategory(preset, category);
    printCategoriesList(preset);
}

/**
 * Renames a category within a specified preset and updates the stored settings.
 *
 * @param {string} preset - The name of the preset containing the category to rename.
 * @param {string} category - The name of the category to be renamed.
 * @param {string} newName - The new name to assign to the category.
 * @return {void} This function does not return any value.
 */
export function renameCategory(preset, category, newName) {
    updateCategoryName(preset, category, newName);
    printCategoriesList(preset);
}

/**
 * Updates the names of the preset items in a dropdown menu by iterating through each dropdown item,
 * fetching the associated preset using its index, and setting its name as the item's text content.
 *
 * @return {void} This function does not return a value.
 */
export function updateDropdownPresetNames() {
    $('#preset-submenu .dropdown-ui-item').each(function () {
        const presetIndex = $(this).data('preset');
        const newName = getPreset(presetIndex).name;
        if (newName) {
            $(this).text(newName);
        }
    });
}
