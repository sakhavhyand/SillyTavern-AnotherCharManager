import { resetScrollHeight } from "../utils.js";
import { closeDetails, closeModal, openModal } from "../components/modal.js";
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
    // Switch UI
    $('#acm_switch_ui').on("click", function () {
        $('#dropdown-ui-menu').toggle();
        window.acmPoppers.UI.update();
    });

    $('#acm_dropdown_sub').on("click", function () {
        $('#dropdown-submenu').toggle();
        window.acmPoppers.UISub.update();
    });

    $('#acm_dropdown_cat').on("click", function () {
        $('#preset-submenu').toggle();
        window.acmPoppers.UIPreset.update();
    });

    $('#acm_switch_classic').on("click", function () {
        if (getSetting('dropdownUI')) {
            updateSetting('dropdownUI', false);
            refreshCharListDebounced();
        }
        $('#dropdown-ui-menu').toggle();
        window.acmPoppers.UI.update();
        $('#dropdown-submenu').toggle(false);
        window.acmPoppers.UISub.update();
        $('#preset-submenu').toggle(false);
        window.acmPoppers.UIPreset.update();
    });

    $('#acm_switch_alltags').on("click", function () {
        if (!getSetting('dropdownUI') || (getSetting('dropdownUI') && getSetting('dropdownMode') !== 'allTags')) {
            updateSetting('dropdownUI', true);
            updateSetting('dropdownMode', "allTags");
            refreshCharListDebounced();
        }
        $('#dropdown-ui-menu').toggle();
        window.acmPoppers.UI.update();
        $('#dropdown-submenu').toggle(false);
        window.acmPoppers.UISub.update();
        $('#preset-submenu').toggle(false);
        window.acmPoppers.UIPreset.update();
    });

    $('#acm_switch_creators').on("click", function () {
        if (!getSetting('dropdownUI') || (getSetting('dropdownUI') && getSetting('dropdownMode') !== 'creators')) {
            updateSetting('dropdownUI', true);
            updateSetting('dropdownMode', "creators")
            refreshCharListDebounced();
        }
        $('#dropdown-ui-menu').toggle();
        window.acmPoppers.UI.update();
        $('#dropdown-submenu').toggle(false);
        window.acmPoppers.UISub.update();
        $('#preset-submenu').toggle(false);
        window.acmPoppers.UIPreset.update();
    });

    $('#acm_manage_categories').on("click", function () {
        $('#dropdown-ui-menu').toggle();
        window.acmPoppers.UI.update();
        $('#dropdown-submenu').toggle(false);
        window.acmPoppers.UISub.update();
        $('#preset-submenu').toggle(false);
        window.acmPoppers.UIPreset.update();
        manageCustomCategories();
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        if(getSetting('dropdownUI') && getSetting('dropdownMode') === 'custom'){$('.popup-button-ok').on('click', function () {refreshCharListDebounced();});}
        printCategoriesList(selectedPreset,true)
    });

    $(document).on('click', '[data-ui="preset"]', function () {
        if (!getSetting('dropdownUI')
            || (getSetting('dropdownUI') && getSetting('dropdownMode') !== 'custom')
            || (getSetting('dropdownUI') && getSetting('dropdownMode') === 'custom' && getSetting('presetId') !== $(this).data('preset'))
        ) {
            updateSetting('dropdownUI', true);
            updateSetting('dropdownMode', "custom");
            updateSetting('presetId', $(this).data('preset'));
            refreshCharListDebounced();
        }
        $('#dropdown-ui-menu').toggle();
        window.acmPoppers.UI.update();
        $('#dropdown-submenu').toggle(false);
        window.acmPoppers.UISub.update();
        $('#preset-submenu').toggle(false);
        window.acmPoppers.UIPreset.update();
    })

// Close the Popper menu when clicking outside
    document.addEventListener('click', (event) => {
        const menuElements = [
            document.getElementById('dropdown-ui-menu'),
            document.getElementById('dropdown-submenu'),
            document.getElementById('preset-submenu'),
            document.getElementById('acm_switch_ui')
        ];

        if (!menuElements.some(menu => menu && menu.contains(event.target))) {
            document.getElementById('dropdown-ui-menu').style.display = 'none';
            document.getElementById('dropdown-submenu').style.display = 'none';
            document.getElementById('preset-submenu').style.display = 'none';
        }
        if (!document.getElementById('acm_export_format_popup').contains(event.target) && !document.getElementById('acm_export_button').contains(event.target)) {
            document.getElementById('acm_export_format_popup').style.display = 'none';
        }
    });
}
