import { resetScrollHeight } from "../utils.js";
import {
    closeDetails,
    closeModal,
    initializeDropdownClickOutside,
    openModal,
    toggleDropdownMenus
} from "../components/modal.js";
import { getSetting, updateSetting } from "../services/settings-service.js";
import { refreshCharListDebounced } from "../components/charactersList.js";
import { manageCustomCategories, printCategoriesList } from "../components/presets.js";


export function initializeModalEvents() {
    $('#acm-manager').on('click', function () {
        openModal();
    });

    // Trigger when clicking on a drawer to open/close it
    $(document).on('click', '.altgreetings-drawer-toggle', function () {
        const icon = $(this).find('.idit');
        icon.toggleClass('down up').toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
        $(this).closest('.inline-drawer').children('.inline-drawer-content').stop().slideToggle();

        // Set the height of "autoSetHeight" text areas within the inline-drawer to their scroll height
        $(this).closest('.inline-drawer').find('.inline-drawer-content textarea.autoSetHeight').each(function () {
            resetScrollHeight($(this));
        });
    });

    // Trigger when the modal is closed to reset some global parameters
    $('#acm_popup_close').on("click", function () {
        closeModal();
    });

    // Trigger when clicking on the separator to close the character details
    $(document).on('click', '#char-sep', function () {
        closeDetails();
    });
}

export function initializeUIMenuEvents() {
    $('#acm_switch_ui').on("click", () => {
        toggleDropdownMenus({ menuToToggle: 'main' });
    });

    // Sous-menu
    $('#acm_dropdown_sub').on("click", () => {
        toggleDropdownMenus({ menuToToggle: 'sub' });
    });

    // Menu des catégories
    $('#acm_dropdown_cat').on("click", () => {
        toggleDropdownMenus({ menuToToggle: 'preset' });
    });

    const menuActions = {
        '#acm_switch_classic': () => {
            if (getSetting('dropdownUI')) {
                updateSetting('dropdownUI', false);
                refreshCharListDebounced();
            }
        },
        '#acm_switch_alltags': () => {
            if (!getSetting('dropdownUI') || (getSetting('dropdownUI') && getSetting('dropdownMode') !== 'allTags')) {
                updateSetting('dropdownUI', true);
                updateSetting('dropdownMode', "allTags");
                refreshCharListDebounced();
            }
        },
        '#acm_switch_creators': () => {
            if (!getSetting('dropdownUI') || (getSetting('dropdownUI') && getSetting('dropdownMode') !== 'creators')) {
                updateSetting('dropdownUI', true);
                updateSetting('dropdownMode', "creators");
                refreshCharListDebounced();
            }
        },
        '#acm_manage_categories': () => {
            manageCustomCategories();
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            if(getSetting('dropdownUI') && getSetting('dropdownMode') === 'custom') {
                $('.popup-button-ok').on('click', refreshCharListDebounced);
            }
            printCategoriesList(selectedPreset, true);
        },
        '[data-ui="preset"]': function() {
            const presetId = $(this).data('preset');
            if (!getSetting('dropdownUI') ||
                (getSetting('dropdownUI') && getSetting('dropdownMode') !== 'custom') ||
                (getSetting('dropdownUI') && getSetting('dropdownMode') === 'custom' && getSetting('presetId') !== presetId)) {
                updateSetting('dropdownUI', true);
                updateSetting('dropdownMode', "custom");
                updateSetting('presetId', presetId);
                refreshCharListDebounced();
            }
        }
    };

    Object.entries(menuActions).forEach(([selector, action]) => {
        $(document).on('click', selector, function() {
            action.call(this);
            toggleDropdownMenus({ closeAll: true });
        });
    });

    // Gestionnaire de clic extérieur
    document.addEventListener('click', initializeDropdownClickOutside());

}
