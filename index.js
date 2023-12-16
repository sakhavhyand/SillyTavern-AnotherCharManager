// An extension that allows you to manage tags.
import {
    callPopup
} from "../../../../script.js";
import { delay, debounce } from "../../../utils.js";
import { extension_settings } from "../../../extensions.js";

const extensionName = "SillyTavern-TagManager";
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

const defaultSettings = {
    findCount: 10,
    nsfw: false,
};

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
        console.log("Creating extension_settings.tag");
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
    console.log("YEEEAAHH!!!");
}

jQuery(async () => {
    // put our button in between external_import_button and rm_button_group_chats in the form_character_search_form
    // on hover, should say "Search CHub for characters"
    $("#external_import_button").after('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $("#tag-manager").on("click", function () {
        openPopup();
    });

    loadSettings();
});
