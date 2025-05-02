import {refreshCharListDebounced, selectAndDisplay} from "../components/charactersList.js";
import {updateSetting} from "../services/settings-service.js";
import {setSearchValue} from "../constants/settings.js";

export function initializeCharactersListEvents() {
    // Trigger when a character is selected in the list
    $(document).on('click', '.char_select', function () {
        selectAndDisplay(this.dataset.avatar);
    });
}

export function initializeToolbarEvents() {

    // Add trigger to open or close the tag list for filtering
    $(document).on('click', '#acm_tags_filter', function () {
        const tagsList = document.getElementById('tags-list');

        // Check if div already opened
        if (tagsList.classList.contains('open')) {
            setTimeout(() => {
                tagsList.style.minHeight = '0';
                tagsList.style.height = '0';
            }, 10);
            tagsList.classList.toggle('open');
        } else {
            setTimeout(() => {
                tagsList.style.minHeight  = tagsList.scrollHeight > 80 ? '80px' : (tagsList.scrollHeight + 5) + 'px';
                tagsList.style.height = tagsList.style.minHeight;
            }, 10);
            tagsList.classList.toggle('open');
        }
    });

    // Trigger when the sort dropdown is used
    $(document).on('change', '#char_sort_order', function () {
        updateSetting('sortingField', $(this).find(':selected').data('field'));
        updateSetting('sortingOrder', $(this).find(':selected').data('order'));
        refreshCharListDebounced();
    });

    // Trigger when the search bar is used
    $(document).on('input', '#char_search_bar', function () {
        setSearchValue(String($(this).val()).toLowerCase());
        refreshCharListDebounced();
    });

    $('#favOnly_checkbox').on("change", function () {
        if (this.checked) {
            updateSetting('favOnly', true);
            refreshCharListDebounced();
        } else {
            updateSetting('favOnly', false);
            refreshCharListDebounced();
        }
    });

    // Import character by file
    $('#acm_character_import_button').on("click", function () {
        $('#character_import_file').trigger("click");
    });

    // Import character by URL
    $('#acm_external_import_button').on("click", function () {
        $('#external_import_button').trigger("click");
    });

    // Display character creation popup
    $('#acm_character_create_button').on("click", function () {
        const $popup = $('#acm_create_popup');
        if ($popup.css('display') === 'none') {
            $popup.css({ 'display': 'flex', 'opacity': 0.0 }).addClass('open').transition({
                opacity: 1.0,
                duration: 125,
                easing: 'ease-in-out',
            });
        } else {
            $popup.css('display', 'none').removeClass('open');
        }
    });
}
