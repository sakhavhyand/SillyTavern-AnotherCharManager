import { displayTag } from './acm_tags.js';

const getContext = SillyTavern.getContext;
const POPUP_TYPE = getContext().POPUP_TYPE;
const callPopup = getContext().callGenericPopup;
const extensionSettings = getContext().extensionSettings;

export { manageCustomCategories, printCategoriesList };

// Function to display the Custom Categories Management
async function manageCustomCategories(){
    const html = $(document.createElement('div'));
    html.attr('id', 'acm_custom_catagories');
    const selectElement = $(`
        <select id="preset_selector" title="Preset Selector"></select>
    `);
    extensionSettings.acm.dropdownPresets.forEach((preset, index) => {
        selectElement.append(`<option data-preset="${index}">${preset.name}</option>`);
    });
    html.append(`
    <div class="title_restorable alignItemsBaseline">
        <h3>Custom Categories</h3>
        <div class="flex-container alignItemsBaseline">
            ${selectElement.prop('outerHTML')}
            <div class="menu_button menu_button_icon cat_view_create" title="Create a new category">
                <i class="fa-solid fa-plus"></i>
                <span data-i18n="Create">Create</span>
            </div>
        </div>
    </div>
     <div class="justifyLeft m-b-1">
         <h4 id="preset_name">${extensionSettings.acm.dropdownPresets[0].name}</h4>
         <small>
             Drag handle to reorder. Click name to rename.<br>
         </small>
     </div>
    `);

    const catContainer = $('<div class="ui-sortable"></div>');
    printCategoriesList(catContainer, '0');
    // makeTagListDraggable(catContainer);

    html.append(catContainer);
    await callPopup(html, POPUP_TYPE.TEXT, null, { allowVerticalScrolling: true });

}

// Function to print the categories and associated tags of a specific preset
function printCategoriesList(catContainer, presetID){
    catContainer.empty();
    const preset = extensionSettings.acm.dropdownPresets[presetID];
    if(preset.categories.length === 0){
        catContainer.append("No category defined");
    }
    else {
        preset.categories.forEach(cat => {
            const catHTML = `
                        <div>
                            <div class="acm_catList">
                                <h4>-${cat.name}-</h4>
                                <div style="display:flex;">
                                    <div class="menu_button fa-solid fa-edit" title="Rename category"></div>
                                    <div class="menu_button fa-solid fa-trash" title="Delete category"></div>
                                </div>
                            </div>
                            <div class="acm_catTagList"></div>
                        </div>`;
            const catElement = $(catHTML);
            const catTagList = catElement.find('.acm_catTagList');
            cat.members.forEach(tag => {
                catTagList.append(displayTag(tag, false));
            });
            catContainer.append(catElement);
        });
    }
}
