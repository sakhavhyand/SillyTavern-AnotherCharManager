import { updateSetting } from "../services/settings-service.js";
import { selectedChar, setSearchValue } from "../constants/settings.js";
import { callPopup, characters, POPUP_TYPE } from "../constants/context.js";
import {refreshCharListDebounced, renameChar, selectAndDisplay} from "../components/characters.js";
import { getIdByAvatar } from "../utils.js";

export function initializeToolbarEvents() {
    // Trigger when a character is selected in the list
    $(document).on('click', '.char_select', function () {
        selectAndDisplay(this.dataset.avatar);
    });

    // Add trigger to open/close tag list for filtering
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

    // Import character by file
    $('#acm_rename_button').on("click", async function () {
        const charID = getIdByAvatar(selectedChar);
        const newName = await callPopup('<h3>New name:</h3>', POPUP_TYPE.INPUT, characters[charID].name);
        await renameChar(selectedChar, charID, newName);
    });
}
