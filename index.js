// An extension that allows you to manage tags.
import {
    getEntitiesList,
    getThumbnailUrl,
    setMenuType,
    menu_type,
    default_avatar,
    this_chid,
    setCharacterId,
    eventSource,
    event_types,
} from '../../../../script.js';

import { getTagsList, createTagInput } from '../../../tags.js';

// Initializing some variables
const extensionName = 'SillyTavern-AnotherTagManager';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
let charsList = [];
let mem_chid;
let mem_menu;
let sortOrder = 'asc';
let sortData = 'name';
let searchValue = '';

// Function to build the character array based on entities
function buildCharAR() {

    const entities = getEntitiesList({ doFilter: false }).filter(item => item.type === 'character');

    charsList = entities.map(entity => {
        return {
            id: entity.id,
            name: entity.item.name,
            avatar: entity.item.avatar,
            description: entity.item.description,
            creatorcomment: entity.item.creatorcomment !== undefined ? entity.item.creatorcomment : entity.item.data.creator_notes,
            tags: getTagsList(entity.item.avatar),
        };
    });
}

// Function to sort the character array based on specified property and order
function sortCharAR(chars, sort_data, sort_order) {
    return chars.sort((a, b) => {
        let comparison = 0;

        if (sort_data == 'name') {
            comparison = a[sort_data].localeCompare(b[sort_data]);
        } else if (sort_data == 'tags') {
            comparison = a[sort_data].length - b[sort_data].length;
        }

        return sort_order === 'desc' ? comparison * -1 : comparison;
    });
}

// Function to generate the HTML block for a character
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
                    <div>${item.name} : ${item.tags.length}</div>
                </div>`;
}

// Function to generate the HTML for displaying a tag
function displayTag({ id, name, color }){
    return `<span id="${id}" class="tag" style="background-color: ${color};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark tag_remove"></i>
                </span>`;
}

// Function to fill details in the character details block
function fillDetails(item) {

    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }

    // Filling details block
    document.getElementById('char-details-block').innerHTML = `<div class="char-details-summary">
                                    <div title="${item.avatar}">
                                        <img src="${this_avatar}">
                                    </div>
                                    <div class="char-details-summary-desc">
                                        <div class="ch_name_details">${item.name}</div>
                                        <div>${item.creatorcomment}</div>
                                    </div>
                                </div>
                                <div class="char-details-tags">
                                    <div class="tag-searchbar">
                                        <input id="input_tag" class="text_pole tag_input wide100p margin0 ui-autocomplete-input" data-i18n="[placeholder]Search / Create Tags" placeholder="Search / Create tags" maxlength="50" autocomplete="off">
                                    </div>
                                    <div id="tag_List" class="tags">
                                        ${item.tags.map((tag) => displayTag(tag)).join('')}
                                    </div>
                                </div>`;
    createTagInput('#input_tag', '#tag_List');
    document.getElementById('desc_zone').value = item.description;
}

// Function to refresh the character list based on search and sorting parameters
function refreshCharList() {

    let filteredChars;

    // Filtering only if there is more than three chars in the searchbar
    if(searchValue !== '' && searchValue.length >= 3){
        filteredChars = charsList.filter(item => {
            return item.description.toLowerCase().includes(searchValue) ||
                item.name.toLowerCase().includes(searchValue) ||
                item.creatorcomment.toLowerCase().includes(searchValue);
        });
    }

    // Sorting the characters
    const sortedList = sortCharAR((filteredChars == undefined ? charsList : filteredChars), sortData, sortOrder);

    // Generating characters HTML
    const htmlList = sortedList.map((item) => getCharBlock(item)).join('');

    document.getElementById('character-list').innerHTML = '';
    document.getElementById('character-list').innerHTML = htmlList;
}

// Function to display the selected character
function selectAndDisplay(id) {

    // Check if a visible character is already selected
    if(typeof this_chid !== 'undefined' && document.getElementById(`CharDID${this_chid}`) !== null){
        document.getElementById(`CharDID${this_chid}`).classList.replace('char_selected','char_select');
    }
    setMenuType('character_edit');
    setCharacterId(id);

    fillDetails(charsList.filter(item => item.id == id)[0]);

    document.getElementById(`CharDID${id}`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.removeProperty('display');
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to close the details panel
function closeDetails() {
    document.getElementById(`CharDID${this_chid}`).classList.replace('char_selected','char_select');
    document.getElementById('char-details').style.display = 'none';
    document.getElementById('char-sep').style.display = 'none';
}

// Function to build the modal
function openModal() {

    // Memorize some global variables
    mem_chid = this_chid;
    mem_menu = menu_type;
    setCharacterId(undefined);

    // Build our own characters list
    buildCharAR();
    charsList = sortCharAR(charsList, sortData, sortOrder);

    // Display the modal with our list layout
    $('#atm_popup').toggleClass('wide_dialogue_popup');
    $('#atm_popup').toggleClass('large_dialogue_popup');
    $('#character-list').empty().append(charsList.map((item) => getCharBlock(item)).join(''));
    $('#atm_shadow_popup').css('display', 'block');

    $('#atm_shadow_popup').transition({
        opacity: 1,
        duration: 125,
        easing: 'ease-in-out',
    });

    // Add listener to refresh the display on characters edit
    eventSource.on(event_types.SETTINGS_UPDATED, function () {buildCharAR(); refreshCharList();});

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

    // Create the shadow div
    const modalHtml = await $.get(`${extensionFolderPath}/modal.html`);
    $('#background_template').after(modalHtml);

    // Put the button before rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#rm_button_group_chats').before('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openModal();
    });

    // Trigger when a character is selected in the list
    $(document).on('click', '.char_select', function () {
        selectAndDisplay($(this).attr('chid'));
    });

    // Trigger when the sort dropdown is used
    $(document).on('change', '#char_sort_order' , function () {
        sortData = $(this).find(':selected').data('field');
        sortOrder = $(this).find(':selected').data('order');
        refreshCharList();
    });

    // Trigger when the search bar is used
    $(document).on('input','#char_search_bar', function () {
        searchValue = String($(this).val()).toLowerCase();
        refreshCharList();
    });

    // Trigger when clicking on the separator to close the character details
    $(document).on('click', '#char-sep', function () {
        setCharacterId(undefined);
        closeDetails();
    });

    // Trigger when the modal is closed to reset some global parameters
    $(document).on('click', '#atm_popup_close', function () {
        closeDetails();
        setCharacterId(mem_chid);
        setMenuType(mem_menu);

        $('#atm_shadow_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $('#atm_shadow_popup').css('display', 'none');
            $('#atm_popup').removeClass('large_dialogue_popup');
            $('#atm_popup').removeClass('wide_dialogue_popup');
        }, 125);
    });
});
