import {
    extensionFolderPath,
    mem_avatar, mem_menu,
    oldExtensionFolderPath, selectedChar,
    setMem_avatar,
    setMem_menu, setSelectedChar
} from "../constants/settings.js";
import { updateDropdownPresetNames } from "./dropdownUI.js";
import { characterId, characters, menuType } from "../constants/context.js";
import { getSetting } from "../services/settings-service.js";
import { getIdByAvatar } from "../utils.js";
import { setCharacterId, setMenuType } from '../../../../../../script.js';

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

// Function to build the modal
export function openModal() {

    // Memorize some global variables
    if (characterId !== undefined && characterId >= 0) {
        setMem_avatar(characters[characterId].avatar);
    } else {
        setMem_avatar(undefined);
    }
    setMem_menu(menuType);

    // Display the modal with our list layout
    $('#acm_popup').toggleClass('wide_dialogue_popup large_dialogue_popup');
    $('#acm_shadow_popup').css('display', 'block').transition({
        opacity: 1,
        duration: 125,
        easing: 'ease-in-out',
    });

    const charSortOrderSelect = document.getElementById('char_sort_order');
    Array.from(charSortOrderSelect.options).forEach(option => {
        const field = option.getAttribute('data-field');
        const order = option.getAttribute('data-order');

        option.selected = field === getSetting('sortingField') && order === getSetting('sortingOrder');
    });
    document.getElementById('favOnly_checkbox').checked = getSetting('favOnly');
}

// Function to close the details panel
export function closeDetails( reset = true ) {
    if(reset){ setCharacterId(getIdByAvatar(mem_avatar)); }

    $('#acm_export_format_popup').hide();
    document.querySelector(`[data-avatar="${selectedChar}"]`)?.classList.replace('char_selected','char_select');
    document.getElementById('char-details').style.display = 'none';
    document.getElementById('char-sep').style.display = 'none';
    setSelectedChar(undefined);
}

export function closeModal() {
    closeDetails();
    setCharacterId(getIdByAvatar(mem_avatar));
    setMenuType(mem_menu);
    setMem_avatar(undefined);

    $('#acm_shadow_popup').transition({
        opacity: 0,
        duration: 125,
        easing: 'ease-in-out',
    });
    setTimeout(function () {
        $('#acm_shadow_popup').css('display', 'none');
        $('#acm_popup').removeClass('large_dialogue_popup wide_dialogue_popup');
    }, 125);
}
