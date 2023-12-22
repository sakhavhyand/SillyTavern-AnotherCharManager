// An extension that allows you to manage tags.
import { extension_settings } from '../../../extensions.js';
import { callPopup, getEntitiesList, getThumbnailUrl, setMenuType, setCharacterId, default_avatar, characters } from '../../../../script.js';
import { getTagsList, createTagInput } from '../../../tags.js';

const extensionName = 'SillyTavern-TagManager';
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

let popupState = null;
let savedPopupContent = null;
const defaultSettings = {};
let charsData = {};

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

    let html = `<div class="character_item flex-container char_select" chid="${id}" id="CharID${id}">
                    <div class="avatar" title="${item.avatar}">
                        <img src="${this_avatar}">
                    </div>
                    <div class="description">${item.name} : ${getTagsList(item.avatar).length}</div>
                </div>`;
    return html;
}

function displayTag({ id, name, color }){
    let html = `<span id="${id}" class="tag" style="background-color: ${color};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark remove_tag"></i>
                </span>`;


    return html;
}

function fillDetails({ item, id, type }) {

    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }
    let divDetailsTags = document.getElementById('char-details-tags');


    divDetailsTags.innerHTML = `<div class="character_item flex-container" chid="${id}" id="CharID${id}">
                                    <div class="avatar" title="${item.avatar}">
                                        <img src="${this_avatar}">
                                    </div>
                                    <div>${item.name}</div>
                                    <div>
                                        <div id="tagSearch">
                                            <input id="input_tag" class="text_pole tag_input wide100p margin0 ui-autocomplete-input" data-i18n="[placeholder]Search / Create Tags" placeholder="Search / Create tags" maxlength="50" autocomplete="off">
                                        </div>
                                        <div id="tag_List" class="tags">
                                            ${getTagsList(item.avatar).map((t) => displayTag(t)).join('')}
                                        </div>
                                    </div>
                                </div>`;
    createTagInput('#input_tag', '#tag_List');
    document.getElementById('desc_zone').value = item.description;
}

function cleanAndFillList() {
    charsData = getEntitiesList({ doFilter: false });
    let charList = charsData.filter(i => i.type === 'character').map((e) => getCharBlock(e.item, e.id)).join('');
    document.getElementById('character-list').innerHTML = '';
    document.getElementById('character-list').innerHTML = charList;
}

function openPopup() {

    charsData = getEntitiesList({ doFilter: false });

    const listLayout = `
    <div class="list-character-wrapper flexFlowColumn" id="list-character-wrapper">
        <div class="character-list" id="character-list">
        ${charsData.filter(i => i.type === 'character').map((e) => getCharBlock(e.item, e.id)).join('')}
        </div>
        <hr>
        <div class="character-details" id="char-details" style="display:none">
            <div class="char-details-tags" id="char-details-tags"></div>
            <div class="divider"></div>
            <div class="char-details-desc" id="char-details-desc">
                <div class="desc_div">
                    <span data-i18n="Character Description">Description</span>
                </div>
                <textarea readonly id="desc_zone" class="desc_zone"></textarea>
            </div>
        </div>
        <hr>
    </div>
    `;

    // Call the popup with our list layout
    callPopup(listLayout, 'text', '', { okButton: 'Close', wide: true, large: true });
}

jQuery(async () => {
    // put our button in between external_import_button and rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#external_import_button').after('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openPopup();
    });

    $(document).on('click', '.char_select', async function () {
        const id = $(this).attr('chid');
        setMenuType('character_edit');
        setCharacterId(id);

        fillDetails(charsData.filter(i => i.id == id && i.type === 'character')[0]);

        document.getElementById('character-list').classList.remove('character-list');
        document.getElementById('character-list').classList.add('character-list-selected');
        document.getElementById('char-details').style.display = 'flex';
    });

    loadSettings();
});
