import { event_types, eventSource } from "../constants/context.js";
import {
    addAltGreeting, closeCharacterPopup,
    delAltGreeting, duplicateCharacter, exportCharacter,
    initializeFieldUpdaters, openCharacterChat, renameCharacter, toggleAdvancedDefinitionsPopup,
    toggleFavoriteStatus,
    update_avatar
} from "../components/characters.js";
import { generateTagFilter } from "../components/tags.js";
import { closeDetails } from "../components/modal.js";
import { addListenersTagFilter } from "./tags-events.js";
import { checkApiAvailability, saveAltGreetings } from "../services/characters-service.js";
import { refreshCharListDebounced } from "../components/charactersList.js";

export function initializeCharactersEvents() {
    // Add listener to refresh the display on characters edit
    eventSource.on('character_edited', function () {
        refreshCharListDebounced();
    });
    // Add listener to refresh the display on characters delete
    eventSource.on('characterDeleted', function () {
        let charDetailsState = document.getElementById('char-details');
        if (charDetailsState.style.display !== 'none') {
            closeDetails();
        }
        refreshCharListDebounced();
    });
    // Add listener to refresh the display on characters duplication
    eventSource.on(event_types.CHARACTER_DUPLICATED, refreshCharListDebounced);

    // Load the character list in the background when ST launch
    eventSource.on('character_page_loaded', function () {
        generateTagFilter();
        addListenersTagFilter();
        refreshCharListDebounced();
    });

    // Adding textarea trigger on input
    initializeFieldUpdaters();

    // Trigger when the favorites button is clicked
    $('#acm_favorite_button').on('click', toggleFavoriteStatus);

    // Export character
    $('#acm_export_button').on("click", function () {
        $('#acm_export_format_popup').toggle();
        window.acmPoppers.Export.update();
    });

    $(document).on('click', '.acm_export_format', function() {
        const format = $(this).data('format');
        if (format) {
            exportCharacter(format);
        }
    });

    // Duplicate character
    $('#acm_dupe_button').on("click", duplicateCharacter);

    // Delete character
    $('#acm_delete_button').on("click", function () {
        $('#delete_button').trigger("click");
    });

    // Edit a character avatar
    $('#edit_avatar_button').on('change', async function () {
        const isAvailable = await checkApiAvailability();
        if (isAvailable) {
            await update_avatar(this);
        } else {
            toastr.warning('Please check if the needed plugin is installed! Link in the README.');
        }
    });

    // Rename character
    $('#acm_rename_button').on("click", renameCharacter);

    // Trigger when the Open Chat button is clicked
    $('#acm_open_chat').on('click', openCharacterChat);

    // Display Advanced Definitions popup
    $('#acm_advanced_div').on("click", toggleAdvancedDefinitionsPopup);

    $('#acm_character_cross').on("click", closeCharacterPopup);

    // Add a new alternative greetings
    $(document).on('click', '.fa-circle-plus', async function (event) {
        event.stopPropagation();
        addAltGreeting();
    });

    // Delete an alternative greetings
    $(document).on('click', '.fa-circle-minus', function (event) {
        event.stopPropagation();
        const inlineDrawer = this.closest('.inline-drawer');
        const greetingIndex = parseInt(this.closest('.altgreetings-drawer-toggle').querySelector('.greeting_index').textContent);
        delAltGreeting(greetingIndex, inlineDrawer);
    });
}

/**
 * Attaches an event listener to all elements with the class 'altGreeting_zone'.
 * The event listener triggers the saveAltGreetings function whenever an 'input' event occurs on the element.
 *
 * @return {void} This function does not return anything.
 */
export function addAltGreetingsTrigger(){
    document.querySelectorAll('.altGreeting_zone').forEach(textarea => {
        textarea.addEventListener('input', (event) => {saveAltGreetings(event);});
    });
}
