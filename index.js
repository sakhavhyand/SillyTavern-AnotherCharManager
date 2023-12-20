// An extension that allows you to manage tags.
import { extension_settings } from '../../../extensions.js';
import { callPopup, getEntitiesList, getThumbnailUrl, default_avatar } from '../../../../script.js';

const extensionName = 'SillyTavern-TagManager';
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

let popupState = null;
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

function getCharBlock(item, id) {
    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }

    let html = `<div class="character_item flex-container" chid="${id}" id="CharID${id}">
                    <div class="avatar" title="${item.avatar}">
                        <img src="${this_avatar}">
                    </div>
                    <div class="description">${item.name}</div>
                </div>`;
    // Add to the list
    // return template;
    return html;
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
        return;
    }

    const entities = getEntitiesList({ doFilter: false });

    //${entities.filter(i => i.type === 'character').map((item, id) => getCharBlock(item.item, id)).join('')}
    //const listLayout = popupState ? popupState : `
    const listLayout = popupState ? popupState : `
    <div class="list-character-wrapper flexFlowColumn" id="list-character-wrapper">
        <div class="character-list-popup">
            ${entities.filter(i => i.type === 'character').map((e) => getCharBlock(e.item, e.id)).join('')}
        </div>
        <hr>
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
