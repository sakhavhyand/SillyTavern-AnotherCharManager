import { displayTag } from './acm_tags.js';

const getContext = SillyTavern.getContext;
const POPUP_TYPE = getContext().POPUP_TYPE;
const callPopup = getContext().callGenericPopup;
const extensionSettings = getContext().extensionSettings.acm;
const saveSettingsDebounced = getContext().saveSettingsDebounced;

export { manageCustomCategories, printCategoriesList, addCategory, removeCategory, renameCategory };

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

    // makeTagListDraggable(catContainer);

    await callPopup(html, POPUP_TYPE.TEXT, null, { allowVerticalScrolling: true });

}

// Function to print the categories and associated tags of a specific preset
function printCategoriesList(presetID, init = false){
    const catContainer = init
        ? $('<div id="catContainer" class="ui-sortable"></div>')
        : $("#catContainer").empty() && $("#catContainer");

    const preset = extensionSettings.dropdownPresets[presetID];
    if(preset.categories.length === 0){
        catContainer.append("No category defined");
    }
    else {
        preset.categories.forEach((cat,index) => {
            const catHTML = `
                        <div>
                            <div class="acm_catList">
                                <div class="drag-handle ui-sortable-handle" data-i18n="[title]Drag to reorder categoies">☰</div>
                                <h4>- ${cat.name} -</h4>
                                <div style="display:flex;">
                                    <div class="menu_button fa-solid fa-edit cat_rename" data-catid="${index}" title="Rename category"></div>
                                    <div class="menu_button fa-solid fa-trash cat_delete" data-catid="${index}" title="Delete category"></div>
                                </div>
                            </div>
                            <div class="acm_catTagList"></div>
                        </div>`;
            const catElement = $(catHTML);
            const catTagList = catElement.find('.acm_catTagList');
            cat.members.forEach(tag => {
                catTagList.append(displayTag(tag, true));
            });
            catTagList.append('<i class="fa-solid fa-plus tag addCatTag" data-catid="${index}"></i>');
            catContainer.append(catElement);
        });
    }
    $('#acm_custom_categories').append(catContainer);
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
