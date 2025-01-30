import {createTagInputCat, displayTag} from './acm_tags.js';

const getContext = SillyTavern.getContext;
const POPUP_TYPE = getContext().POPUP_TYPE;
const callPopup = getContext().callGenericPopup;
const extensionSettings = getContext().extensionSettings.acm;
const saveSettingsDebounced = getContext().saveSettingsDebounced;

export { manageCustomCategories, printCategoriesList, addCategory, removeCategory, renameCategory, addTagToCategory, removeTagFromCategory };

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
     <div class="justifyLeft m-b-1">
         <h4 id="preset_name">${extensionSettings.dropdownPresets[0].name}</h4>
         <small>
             Drag handle to reorder.
         </small>
         <div class="menu_button menu_button_icon cat_view_create" title="Create a new category">
             <i class="fa-solid fa-plus"></i>
             <span data-i18n="Create">Create</span>
         </div>
     </div>

    `);
    await callPopup(html, POPUP_TYPE.TEXT, null, { allowVerticalScrolling: true });
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
        update: function (event, ui) {
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
