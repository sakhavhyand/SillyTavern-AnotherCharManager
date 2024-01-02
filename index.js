// An extension that allows you to manage tags.
import { extension_settings } from '../../../extensions.js';
import { callPopup, getEntitiesList, getThumbnailUrl, setMenuType, setCharacterId, default_avatar, characters, this_chid } from '../../../../script.js';
import { getTagsList, createTagInput } from '../../../tags.js';

const extensionName = 'SillyTavern-TagManager';
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

const defaultSettings = {};
let charsList = {};

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


function getCharBlock(item) {

    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }

    let html = `<div class="character_item flex-container char_select" chid="${item.id}" id="CharDID${item.id}">
                    <div class="avatar" title="${item.avatar}">
                        <img src="${this_avatar}">
                    </div>
                    <div class="description">${item.name} : ${item.tags.length}</div>
                </div>`;
    return html;
}

function displayTag({ id, name, color }){
    let html = `<span id="${id}" class="tag" style="background-color: ${color};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark tag_remove"></i>
                </span>`;


    return html;
}

function fillDetails(item) {

    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }
    /**
    let creator_comment = '';
    if(typeof item.creatorcomment !== 'undefined'){
        creator_comment = item.creatorcomment;
    }
    else {
        creator_comment = item.data.creator_notes;
    }*/
    let divDetailsTags = document.getElementById('char-details-block');


    divDetailsTags.innerHTML = `<div class="char-details-summary">
                                    <div class="avatar-tags" title="${item.avatar}">
                                        <img src="${this_avatar}">
                                    </div>
                                    <div class="char-details-summary-desc">
                                        <div class="ch_name_details">${item.name}</div>
                                        <div>${item.creatorcomment}</div>
                                    </div>
                                </div>
                                <div class="char-details-tags">
                                    <div id="tagSearch" class="tag-searchbar">
                                        <input id="input_tag" class="text_pole tag_input wide100p margin0 ui-autocomplete-input" data-i18n="[placeholder]Search / Create Tags" placeholder="Search / Create tags" maxlength="50" autocomplete="off">
                                    </div>
                                    <div id="tag_List" class="tags">
                                        ${item.tags.map((t) => displayTag(t)).join('')}
                                    </div>
                                </div>`;
    createTagInput('#input_tag', '#tag_List');
    document.getElementById('desc_zone').value = item.description;
}

function refreshCharList() {
    let refreshedList = buildCharAR().map((item) => getCharBlock(item)).join('');
    document.getElementById('character-list').innerHTML = '';
    document.getElementById('character-list').innerHTML = refreshedList;
}

function buildCharAR() {

    const charsInit = getEntitiesList({ doFilter: false }).filter(item => item.type === 'character');

    const charsFiltered = charsInit.map(element => {

        return {
            id: element.id,
            name: element.item.name,
            avatar: element.item.avatar,
            description: element.item.description,
            creatorcomment: element.item.creatorcomment !== undefined ? element.item.creatorcomment : element.item.data.creator_notes,
            tags: getTagsList(element.item.avatar),
        };
    });

    return charsFiltered;
}

function openPopup() {

    charsList = buildCharAR();

    const listLayout = `
    <div class="list-character-wrapper flexFlowColumn" id="list-character-wrapper">
        <div id="reload_char" class="menu_button whitespacenowrap">
            Refresh
        </div>
        <div class="character-list" id="character-list">
        ${charsList.map((item) => getCharBlock(item)).join('')}
        </div>
        <hr>
        <div class="character-details" id="char-details" style="display:none">
            <div class="char-details-block" id="char-details-block"></div>
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

function selectAndDisplay(id) {

    if(typeof this_chid !== 'undefined'){
        document.getElementById(`CharDID${this_chid}`).classList.add('char_select');
        document.getElementById(`CharDID${this_chid}`).classList.remove('char_selected');
    }
    setMenuType('character_edit');
    setCharacterId(id);

    fillDetails(charsList.filter(i => i.id == id)[0]);

    document.getElementById(`CharDID${id}`).classList.remove('char_select');
    document.getElementById(`CharDID${id}`).classList.add('char_selected');
    document.getElementById('character-list').classList.remove('character-list');
    document.getElementById('character-list').classList.add('character-list-selected');
    document.getElementById('char-details').style.display = 'flex';

}

jQuery(async () => {
    // put our button in between external_import_button and rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#external_import_button').after('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openPopup();
    });

    $(document).on('click', '.char_select', function () {
        selectAndDisplay($(this).attr('chid'));
    });

    $(document).on('click', '#reload_char', refreshCharList);

    loadSettings();
});
