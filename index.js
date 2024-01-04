// An extension that allows you to manage tags.
import { callPopup, getEntitiesList, getThumbnailUrl, setMenuType, menu_type, default_avatar, this_chid, setCharacterId, eventSource, event_types } from '../../../../script.js';
import { getTagsList, createTagInput } from '../../../tags.js';

let charsList = [];
let mem_chid;
let mem_menu;
let sortOrder = 'asc';
let sortData = 'name';


function buildCharAR() {

    const entities = getEntitiesList({ doFilter: false }).filter(item => item.type === 'character');

    const preCharsList = entities.map(entity => {
        return {
            id: entity.id,
            name: entity.item.name,
            avatar: entity.item.avatar,
            description: entity.item.description,
            creatorcomment: entity.item.creatorcomment !== undefined ? entity.item.creatorcomment : entity.item.data.creator_notes,
            tags: getTagsList(entity.item.avatar),
        };
    });
    charsList = sortCharAR(preCharsList, sortData, sortOrder);
}

function sortCharAR(chars, sort_data, sort_order) {
    return chars.sort((a, b) => {
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

function getCharBlock(item) {

    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }

    const parsedThis_chid = this_chid !== undefined ? parseInt(this_chid, 10) : undefined;
    const charClass = (parsedThis_chid !== undefined && parsedThis_chid === item.id) ? 'char_selected' : 'char_select';

    return `<div class="character_item flex-container ${charClass}" chid="${item.id}" id="CharDID${item.id}">
                    <div class="avatar" title="${item.avatar}">
                        <img src="${this_avatar}">
                    </div>
                    <div class="description">${item.name} : ${item.tags.length}</div>
                </div>`;
}

function displayTag({ id, name, color }){
    return `<span id="${id}" class="tag" style="background-color: ${color};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark tag_remove"></i>
                </span>`;
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
                                        ${item.tags.map((tag) => displayTag(tag)).join('')}
                                    </div>
                                </div>`;
    createTagInput('#input_tag', '#tag_List');
    document.getElementById('desc_zone').value = item.description;
}

function refreshCharList(searchValue = undefined) {

    let filteredChars;

    if(searchValue !== undefined){
        filteredChars = charsList.filter(item => {
            return item.description.toLowerCase().includes(searchValue) ||
                item.name.toLowerCase().includes(searchValue) ||
                item.creatorcomment.toLowerCase().includes(searchValue);
        });
    }

    const sortedList = sortCharAR((filteredChars == undefined ? charsList : filteredChars), sortData, sortOrder);

    const htmlList = sortedList.map((item) => getCharBlock(item)).join('');

    document.getElementById('character-list').innerHTML = '';
    document.getElementById('character-list').innerHTML = htmlList;
}

function selectAndDisplay(id) {

    if(typeof this_chid !== 'undefined'){
        document.getElementById(`CharDID${this_chid}`).classList.add('char_select');
        document.getElementById(`CharDID${this_chid}`).classList.remove('char_selected');
    }
    setMenuType('character_edit');
    setCharacterId(id);

    fillDetails(charsList.filter(item => item.id == id)[0]);

    document.getElementById(`CharDID${id}`).classList.remove('char_select');
    document.getElementById(`CharDID${id}`).classList.add('char_selected');
    document.getElementById('character-list').classList.remove('character-list');
    document.getElementById('character-list').classList.add('character-list-selected');
    document.getElementById('char-details').style.display = 'flex';

}

function openPopup() {

    mem_chid = this_chid;
    mem_menu = menu_type;
    buildCharAR();

    const listLayout = `
    <div class="list-character-wrapper flexFlowColumn" id="list-character-wrapper">
        <div id="sortAndFilter" class="sortAndFilter">
            <form id="form_sort_filter" action="javascript:void(null);">
                <span>Sorted by :</span>
                <select id="char_sort_order" title="Characters sorting order" data-i18n="[title]Characters sorting order">
                    <option data-field="name" data-order="asc" data-i18n="A-Z">A-Z</option>
                    <option data-field="name" data-order="desc" data-i18n="Z-A">Z-A</option>
                    <option data-field="tags" data-order="asc">Least Tags</option>
                    <option data-field="tags" data-order="desc">Most Tags</option>
                </select>
                <input id="char_search_bar" class="text_pole width100p" type="search" data-i18n="[placeholder]Search..." placeholder="Search..." maxlength="100">
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

jQuery(async () => {
    // put our button before rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#rm_button_group_chats').before('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openPopup();
    });

    $(document).on('click', '.char_select', function () {
        selectAndDisplay($(this).attr('chid'));
    });

    eventSource.on(event_types.SETTINGS_UPDATED, refreshCharList);

    $(document).on('change', '#char_sort_order' , function () {
        sortData = $(this).find(':selected').data('field');
        sortOrder = $(this).find(':selected').data('order');

        refreshCharList();
    });

    $(document).on('input','#char_search_bar', function () {
        refreshCharList(String($(this).val()).toLowerCase());
    });

    $(document).on('click', '#dialogue_popup_ok', function () {setCharacterId(mem_chid); setMenuType(mem_menu);});
});
