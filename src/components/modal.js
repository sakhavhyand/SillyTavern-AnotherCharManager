import { extensionFolderPath, oldExtensionFolderPath } from "../constants/settings.js";
import { updateDropdownPresetNames } from "./dropdownUI.js";

let mem_avatar;
let mem_menu;

/**
 * Initializes the modal component
 */
export async function initializeModal() {
    // Load the modal HTML template
    let modalHtml;
    try {
        modalHtml = await $.get(`${extensionFolderPath}/modal.html`);
    } catch (error) {
        console.error(`Error fetching modal.html from ${extensionFolderPath}. This is a normal error if you have the old folder name and you don't have to do anything.`);
        try {
            modalHtml = await $.get(`${oldExtensionFolderPath}/modal.html`);
        } catch (secondError) {
            console.error(`Error fetching modal.html from ${oldExtensionFolderPath}:`, secondError);
            return;
        }
    }

    // Add the modal HTML to the page
    $('#background_template').after(modalHtml);

    // Put the button before rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Char Manager"
    $('#rm_button_group_chats').before('<button id="acm-manager" class="menu_button fa-solid fa-users faSmallFontSquareFix" title="Open Char Manager"></button>');

    // Initialize popper.js for dropdowns
    initializePoppers();
    updateDropdownPresetNames();
}

/**
 * Initializes popper.js for dropdown positioning
 * @private
 */
function initializePoppers() {
    // Create poppers for various dropdowns
    const Export = Popper.createPopper(
        document.getElementById('acm_export_button'),
        document.getElementById('acm_export_format_popup'),
        { placement: 'left' }
    );

    const UI = Popper.createPopper(
        document.getElementById('acm_switch_ui'),
        document.getElementById('dropdown-ui-menu'),
        { placement: 'top' }
    );

    const UISub = Popper.createPopper(
        document.getElementById('acm_dropdown_sub'),
        document.getElementById('dropdown-submenu'),
        { placement: 'right' }
    );

    const UIPreset = Popper.createPopper(
        document.getElementById('acm_dropdown_cat'),
        document.getElementById('preset-submenu'),
        { placement: 'right' }
    );

    // Store poppers for later use
    window.acmPoppers = {
        Export,
        UI,
        UISub,
        UIPreset
    };
}
