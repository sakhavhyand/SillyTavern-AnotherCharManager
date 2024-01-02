// An extension that allows you to manage tags.
import { extension_settings } from '../../../extensions.js';
import { callPopup, getEntitiesList, getThumbnailUrl, setMenuType, default_avatar } from '../../../../script.js';
import { getTagsList, createTagInput } from '../../../tags.js';

const extensionName = 'SillyTavern-TagManager';
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

const defaultSettings = {};
let charsList = {};
let this_charId;
let sortOrder = 'asc';
let sortData = 'name';

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

    const parsedThisId = this_charId !== undefined ? parseInt(this_charId, 10) : undefined;
    const charClass = (parsedThisId !== undefined && parsedThisId === item.id) ? 'char_selected' : 'char_select';

    let html = `<div class="character_item flex-container ${charClass}" chid="${item.id}" id="CharDID${item.id}">
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

function refreshCharList(sort_data = null, sort_order = null) {
    let htmlList = buildCharAR().map((item) => getCharBlock(item)).join('');

    document.getElementById('character-list').innerHTML = '';
    document.getElementById('character-list').innerHTML = htmlList;
}

function sortCharAR(data, sort_data, sort_order) {
    return data.sort((a, b) => {
        // Compare function based on the specified property (sortBy)
        let comparison = 0;

        if (typeof a[sort_data] === 'string') {
            // For string properties, use localeCompare for string comparison
            comparison = a[sort_data].localeCompare(b[sort_data]);
        } else if (typeof a[sort_data] === 'number') {
            // For numeric properties, subtract one from the other
            comparison = a[sort_data] - b[sort_data];
        } else if (Array.isArray(a[sort_data])) {
            // For array properties, compare based on array length
            comparison = a[sort_data].length - b[sort_data].length;
        }

        // Adjust comparison based on order (asc or desc)
        return sort_order === 'desc' ? comparison * -1 : comparison;
    });
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

    return sortCharAR(charsFiltered, sortData, sortOrder);

}

function openPopup() {

    charsList = buildCharAR();

    const listLayout = `
    <div class="list-character-wrapper flexFlowColumn" id="list-character-wrapper">
        <div id="sortAndFilter" class="sortAndFilter">
            <form id="form_sort_filter" action="javascript:void(null);">
                <button id="reload_char" class="menu_button fa-solid fa-arrows-rotate faSmallFontSquareFix" title="Refresh List"></button>
                <select id="char_sort_order" title="Characters sorting order" data-i18n="[title]Characters sorting order">
                    <option data-field="name" data-order="asc" data-i18n="A-Z">A-Z</option>
                    <option data-field="name" data-order="desc" data-i18n="Z-A">Z-A</option>
                    <option data-field="tags" data-order="asc">Least Tags</option>
                    <option data-field="tags" data-order="desc">Most Tags</option>
                </select>
            </form>
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

    const charSortOrderSelect = document.getElementById('char_sort_order');
    Array.from(charSortOrderSelect.options).forEach(option => {
        const field = option.getAttribute('data-field');
        const order = option.getAttribute('data-order');

        if (field === sortData && order === sortOrder) {
            option.selected = true;
        } else {
            option.selected = false;
        }
    });
}

function selectAndDisplay(id) {

    if(typeof this_charId !== 'undefined'){
        document.getElementById(`CharDID${this_charId}`).classList.add('char_select');
        document.getElementById(`CharDID${this_charId}`).classList.remove('char_selected');
    }
    setMenuType('character_edit');
    this_charId = id;

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
    $('#rm_button_group_chats').before('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openPopup();
    });

    $(document).on('click', '.char_select', function () {
        selectAndDisplay($(this).attr('chid'));
    });

    $(document).on('click', '#reload_char', refreshCharList);

    $(document).on('change', '#char_sort_order' , function () {
        sortData = $(this).find(':selected').data('field');
        sortOrder = $(this).find(':selected').data('order');

        refreshCharList(sortData, sortOrder);
    });

    $(document).on('click', '#dialogue_popup_ok', function () {this_charId = undefined;});

    loadSettings();
});
