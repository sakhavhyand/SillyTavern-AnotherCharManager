// An extension that allows you to manage tags.
import { extension_settings } from '../../../extensions.js';
import { callPopup, getCharacters } from '../../../../script.js';

const extensionName = 'SillyTavern-TagManager';
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

let savedPopupContent = null;

const defaultSettings = {};

/**
 * Asynchronously loads settings from `extension_settings.tag`,
 * filling in with default settings if some are missing.
 *
 * After loading the settings, it also updates the UI components
 * with the appropriate values from the loaded settings.
 */
async function loadSettings() {
    // Ensure extension_settings.timeline exists
    if (!extension_settings.tag) {
        console.log('Creating extension_settings.tag');
        extension_settings.tag = {};
    }

    // Check and merge each default setting if it doesn't exist
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (!extension_settings.tag.hasOwnProperty(key)) {
            console.log(`Setting default for: ${key}`);
            extension_settings.tag[key] = value;
        }
    }

}

function openPopup() {

    if (savedPopupContent) {
        console.log('Using saved popup content');
        // Append the saved content to the popup container
        callPopup('', 'text', '', { okButton: 'Close', wide: true, large: true })
            .then(() => {
                savedPopupContent = document.querySelector('.list-character-wrapper');
            });

        document.getElementById('dialogue_popup_text').appendChild(savedPopupContent);
        // characterListContainer = document.querySelector('.character-list-popup');
        return;
    }

    const listLayout = `
    <div class="list-character-wrapper" id="list-character-wrapper">
        <div class="character-list-popup">
        ${getCharacters()}
        </div>
        <hr>
        <div class="character-container">

        </div>
    </div>
`;

    // Call the popup with our list layout
    callPopup(listLayout, 'text', '', { okButton: 'Close', wide: true, large: true })
        .then(() => {
            savedPopupContent = document.querySelector('.list-and-search-wrapper');
        });
}

jQuery(async () => {
    // put our button in between external_import_button and rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#external_import_button').after('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openPopup();
    });

    loadSettings();
});
