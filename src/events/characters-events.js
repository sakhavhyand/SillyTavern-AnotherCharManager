import { callPopup, characters, event_types, eventSource, POPUP_TYPE } from "../constants/context.js";
import { closeDetails, refreshCharList, refreshCharListDebounced, update_avatar } from "../../index.js";
import { addListenersTagFilter, generateTagFilter } from "../components/tags.js";
import { getIdByAvatar } from "../utils.js";
import { selectedChar } from "../constants/settings.js";
import { checkApiAvailability, dupeChar, editCharDebounced, exportChar } from "../components/characters.js";

export function initializeCharactersEvents() {
    // Add listener to refresh the display on characters edit
    eventSource.on('character_edited', function () {
        refreshCharListDebounced();
    });
    // Add listener to refresh the display on characters delete
    eventSource.on('characterDeleted', function () {
        let charDetailsState = document.getElementById('char-details');
        if (charDetailsState.style.display === 'none') {
            refreshCharListDebounced();
        } else {
            closeDetails();
            refreshCharListDebounced();
        }
    });
    // Add listener to refresh the display on characters duplication
    eventSource.on(event_types.CHARACTER_DUPLICATED, function () {
        refreshCharListDebounced();
    });
    // Load the characters list in background when ST launch
    eventSource.on('character_page_loaded', function () {
        generateTagFilter();
        addListenersTagFilter();
        refreshCharList();
    });

    // Trigger when the favorites button is clicked
    $('#acm_favorite_button').on('click', function () {
        const id = getIdByAvatar(selectedChar);
        if (characters[id].fav || characters[id].data.extensions.fav) {
            const update = { avatar: selectedChar, fav: false, data: { extensions: { fav: false } } };
            editCharDebounced(update);
            $('#acm_favorite_button')[0].classList.replace('fav_on', 'fav_off');
        } else {
            const update = { avatar: selectedChar, fav: true, data: { extensions: { fav: true } } };
            editCharDebounced(update);
            $('#acm_favorite_button')[0].classList.replace('fav_off', 'fav_on');
        }
    });
    // Export character
    $('#acm_export_button').on("click", function () {
        $('#acm_export_format_popup').toggle();
        window.acmPoppers.Export.update();
    });

    $(document).on('click', '.acm_export_format', function () {
        const format = $(this).data('format');
        if (!format) {
            return;
        }
        exportChar(format, selectedChar);
    });

    // Duplicate character
    $('#acm_dupe_button').on("click", async function () {
        if (!selectedChar) {
            toastr.warning('You must first select a character to duplicate!');
            return;
        }

        const confirmMessage = `
            <h3>Are you sure you want to duplicate this character?</h3>
            <span>If you just want to start a new chat with the same character, use "Start new chat" option in the bottom-left options menu.</span><br><br>`;

        const confirm = await callPopup(confirmMessage, POPUP_TYPE.CONFIRM);

        if (!confirm) {
            console.log('User cancelled duplication');
            return;
        }
        await dupeChar(selectedChar);
    });

    // Delete character
    $('#acm_delete_button').on("click", function () {
        $('#delete_button').trigger("click");
    });

    // Edit a character avatar
    $('#edit_avatar_button').on('change', function () {
        checkApiAvailability().then(async isAvailable => {
            if (isAvailable) {
                await update_avatar(this);
            } else {
                toastr.warning('Please check if the needed plugin is installed! Link in the README.');
            }
        });
    });
}
