import { createTagInputCat, displayTag } from './acm_tags.js';
import { getCharBlock } from "../index.js";

const getContext = SillyTavern.getContext;
const POPUP_TYPE = getContext().POPUP_TYPE;
const callPopup = getContext().callGenericPopup;
const tagMap = getContext().tagMap;
const tagList = getContext().tags;
const extensionSettings = getContext().extensionSettings.acm;
const saveSettingsDebounced = getContext().saveSettingsDebounced;

export { manageCustomCategories, printCategoriesList, addCategory, removeCategory, renameCategory, addTagToCategory, removeTagFromCategory, dropdownAllTags, dropdownCustom, dropdownCreators, renamePreset, updatePresetNames };

function dropdownAllTags(sortedList){
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

function dropdownCustom(sortedList){
    const preset = extensionSettings.customPreset;
    const categories = extensionSettings.dropdownPresets[preset].categories;
    return categories.map(category => {
        const members = category.members;
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

function dropdownCreators(sortedList){
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

// Function to display the Custom Categories Management
async function manageCustomCategories(){
    const html = $(document.createElement('div'));
    html.attr('id', 'acm_custom_categories');
    const selectElement = $(`
        <select id="preset_selector" title="Preset Selector"></select>
    `);
    extensionSettings.dropdownPresets.forEach((preset, index) => {
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
             <h4 id="preset_name">${extensionSettings.dropdownPresets[0].name}</h4>
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

// Function to print the categories and associated tags of a specific preset
function printCategoriesList(presetID, init = false){
    const catContainer = init
        ? $('<div id="catContainer"></div>')
        : $("#catContainer").empty() && $("#catContainer");

    const preset = extensionSettings.dropdownPresets[presetID];
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
            cat.members.forEach(tag => {
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
            const currentCategories = extensionSettings.dropdownPresets[presetID].categories;
            extensionSettings.dropdownPresets[presetID].categories = newOrder.map(index => currentCategories[index]);
            saveSettingsDebounced();
        },
    });

    $(".drag-handle")
        .mousedown(function () { $(this).css("cursor", "grabbing"); })
        .mouseup(function () { $(this).css("cursor", "grab"); }
    );
}

function renamePreset(preset, newName) {
    extensionSettings.dropdownPresets[preset].name = newName;
    saveSettingsDebounced();
    $('#preset_name').html(newName);
    $(`#preset_selector option`).filter((_, element) => $(element).data('preset') === preset).text(newName);
    updatePresetNames();
}

function addCategory(preset, catName){
    extensionSettings.dropdownPresets[preset].categories.push({
        name: catName,
        members: [],
    });
    saveSettingsDebounced();
    printCategoriesList(preset);
}

function removeCategory(preset, category) {
    extensionSettings.dropdownPresets[preset].categories
        .splice(category, 1);
    saveSettingsDebounced();
    printCategoriesList(preset);
}

function renameCategory(preset, category, newName) {
    extensionSettings.dropdownPresets[preset].categories[category].name = newName;
    saveSettingsDebounced();
    printCategoriesList(preset);
}

function addTagToCategory(preset, category, tag) {
    extensionSettings.dropdownPresets[preset].categories[category].members.push(tag);
    saveSettingsDebounced();
}

function removeTagFromCategory(preset, category, tag) {
    const members = extensionSettings.dropdownPresets[preset].categories[category].members;
    const tagIndex = members.indexOf(tag);

    if (tagIndex !== -1) {
        members.splice(tagIndex, 1);
        saveSettingsDebounced();
    }
}

function updatePresetNames() {
    $('#preset-submenu .dropdown-ui-item').each(function () {
        const presetIndex = $(this).data('preset');
        const newName = extensionSettings.dropdownPresets[presetIndex]?.name;
        if (newName) {
            $(this).text(newName);
        }
    });
}
