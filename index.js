// An extension that allows you to manage tags.
import {
    setMenuType,
    setCharacterId,
    getOneCharacter,
    depth_prompt_role_default,
} from '../../../../script.js';
import { resetScrollHeight } from '../../../utils.js';
import { createTagInput } from '../../../tags.js';

const getTokenCount = SillyTavern.getContext().getTokenCount;
const getThumbnailUrl = SillyTavern.getContext().getThumbnailUrl;
const eventSource = SillyTavern.getContext().eventSource;
const event_types = SillyTavern.getContext().eventTypes;

// Initializing some variables
const extensionName = 'SillyTavern-AnotherTagManager';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 100);
const editCharDebounced = debounce(() => { editChar(); }, 1000);
const editUrl = '/api/characters/edit';
let mem_chid;
let selectedId;
let mem_menu;
let mem_avatar;
let displayed;
let sortOrder = 'asc';
let sortData = 'name';
let searchValue = '';

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

function getIdByAvatar(avatar){
    const characters = SillyTavern.getContext().characters;
    return characters.findIndex(character => character.avatar === avatar);
}


// Function to sort the character array based on specified property and order
function sortCharAR(chars, sort_data, sort_order) {
    const tagMap = SillyTavern.getContext().tagMap;

    return chars.sort((a, b) => {
        let comparison = 0;

        switch (sort_data) {
            case 'name':
                comparison = a[sort_data].localeCompare(b[sort_data]);
                break;
            case 'tags':
                comparison = tagMap[a.avatar].length - tagMap[b.avatar].length;
                break;
            case 'date_last_chat':
                comparison = b[sort_data] - a[sort_data];
                break;
            case 'date_added':
                comparison = b[sort_data] - a[sort_data];
                break;
        }

        return sort_order === 'desc' ? comparison * -1 : comparison;
    });
}

// Function to generate the HTML block for a character
function getCharBlock(avatar) {
    const characters = SillyTavern.getContext().characters;
    const tagMap = SillyTavern.getContext().tagMap;
    const id = getIdByAvatar(avatar);
    const avatarThumb = getThumbnailUrl('avatar', avatar);

    const parsedThis_chid = selectedId !== undefined ? parseInt(selectedId, 10) : undefined;
    const charClass = (parsedThis_chid !== undefined && parsedThis_chid === id) ? 'char_selected' : 'char_select';

    return `<div class="character_item ${charClass}" chid="${id}" id="CharDID${id}">
                    <div class="avatar_item">
                        <img src="${avatarThumb}" alt="${characters[id].avatar}">
                    </div>
                    <div class="char_name">${characters[id].name} : ${tagMap[avatar].length}</div>
                </div>`;
}

// Function to generate the HTML for displaying a tag
function displayTag( tagId ){
    const tagList = SillyTavern.getContext().tags;
    const name = tagList.find(tagList => tagList.id === tagId).name;
    const color = tagList.find(tagList => tagList.id === tagId).color;

    if(tagList.find(tagList => tagList.id === tagId).color2){
        const color2 = tagList.find(tagList => tagList.id === tagId).color2;

        return `<span id="${tagId}" class="tag" style="background-color: ${color}; color: ${color2};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark tag_remove"></i>
                </span>`;
    } else {
        return `<span id="${tagId}" class="tag" style="background-color: ${color};">
                    <span class="tag_name">${name}</span>
                    <i class="fa-solid fa-circle-xmark tag_remove"></i>
                </span>`;
    }
}

function displayAltGreetings(item) {

    let altGreetingsHTML = '';

    if(item.length === 0){
        return '<span>Nothing here but chickens!!</span>';
    }
    else {
        for (let i = 0; i < item.length; i++) {
            let greetingNumber = i + 1;
            altGreetingsHTML += `<div class="inline-drawer">
                <div id="altGreetDrawer${greetingNumber}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <b>Greeting #${greetingNumber}</b>
                    <span>Tokens: ${getTokenCount(item[i])}</span>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <textarea readonly class="altGreeting_zone autoSetHeight">${item[i]}</textarea>
                </div>
            </div>`;
        }
        return altGreetingsHTML;
    }
}

// Function to fill details in the character details block
function fillDetails(id) {

    const characters = SillyTavern.getContext().characters;
    const tagMap = SillyTavern.getContext().tagMap;
    const char = characters[id];
    const this_avatar = getThumbnailUrl('avatar', char.avatar);

    $('#avatar_title').attr('title', char.avatar);
    $('#avatar_img').attr('src', this_avatar);
    document.getElementById('ch_name_details').innerHTML = char.name;
    document.getElementById('crea_comment').innerHTML = char.creatorcomment;
    document.getElementById('tag_List').innerHTML = `${tagMap[char.avatar].map((tag) => displayTag(tag)).join('')}`;
    createTagInput('#input_tag', '#tag_List');
    document.getElementById('desc_Tokens').innerHTML = `Tokens: ${getTokenCount(char.description)}`;
    $('#desc_zone').val(char.description);
    document.getElementById('firstMess_tokens').innerHTML = `Tokens: ${getTokenCount(char.first_mes)}`;
    $('#firstMes_zone').val(char.first_mes);
    document.getElementById('altGreetings_number').innerHTML = `Numbers: ${char.data.alternate_greetings.length}`;
    document.getElementById('altGreetings_content').innerHTML = displayAltGreetings(char.data.alternate_greetings);
}

function buildFormData() {
    const formData = new FormData();
    const this_chid = SillyTavern.getContext().characterId;
    const characters = SillyTavern.getContext().characters;

    formData.append('ch_name', characters[this_chid].name);
    formData.append('avatar', '');
    formData.append('fav', characters[this_chid].fav);
    formData.append('description', $('#desc_zone').val());
    formData.append('first_mes', $('#firstMes_zone').val());
    formData.append('json_data', characters[this_chid].json_data);
    formData.append('avatar_url', characters[this_chid].avatar);
    formData.append('chat', characters[this_chid].chat);
    formData.append('create_date', characters[this_chid].create_date);
    formData.append('last_mes', '');
    formData.append('world', characters[this_chid].data?.extensions?.world ?? '');
    formData.append('system_prompt', characters[this_chid].data.system_prompt);
    formData.append('post_history_instructions', characters[this_chid].data.post_history_instructions);
    formData.append('creator', characters[this_chid].creator);
    formData.append('character_version', characters[this_chid].character_version);
    formData.append('creator_notes', characters[this_chid].creatorcomment !== undefined ? characters[this_chid].creatorcomment : characters[this_chid].data.creator_notes);
    formData.append('tags', '');
    formData.append('personality', characters[this_chid].personality);
    formData.append('scenario', characters[this_chid].scenario);
    formData.append('depth_prompt_prompt', characters[this_chid].data?.extensions?.depth_prompt?.prompt);
    formData.append('depth_prompt_depth', characters[this_chid].data?.extensions?.depth_prompt?.depth);
    formData.append('depth_prompt_role', characters[this_chid].data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default);
    formData.append('talkativeness', characters[this_chid].data.extensions.talkativeness);
    formData.append('mes_example', characters[this_chid].mes_example);

    if (this_chid && Array.isArray(characters[this_chid]?.data?.alternate_greetings)) {
        for (const value of characters[this_chid].data.alternate_greetings) {
            formData.append('alternate_greetings', value);
        }
    }
    return formData;
}

async function editChar() {
    const this_chid = SillyTavern.getContext().characterId;
    const characters = SillyTavern.getContext().characters;

    await jQuery.ajax({
        type: 'POST',
        url: editUrl,
        data: buildFormData(),
        cache: false,
        contentType: false,
        processData: false,
        success: async function () {
            await getOneCharacter(characters[this_chid].avatar);
            eventSource.emit(event_types.CHARACTER_EDITED, { detail: { id: this_chid, character: characters[this_chid] } });
        },
        error: function (jqXHR, exception) {
            console.log('Error! Either a file with the same name already existed, or the image file provided was in an invalid format. Double check that the image is not a webp.');
        },
    });
}

// Function to refresh the character list based on search and sorting parameters
function refreshCharList() {

    let filteredChars = [];
    let sortedListId = [];
    const characters = SillyTavern.getContext().characters;

    // Filtering only if there is more than three chars in the searchbar
    if(searchValue !== ''){
        filteredChars = characters.filter(item => {
            return item.description?.toLowerCase().includes(searchValue) ||
                item.name?.toLowerCase().includes(searchValue) ||
                item.creatorcomment?.toLowerCase().includes(searchValue);
        });
    }

    if(filteredChars.length > 0){
        // Iterate over each object in filteredChars
        filteredChars.forEach(filteredChar => {
            // Find the index of the corresponding character in the characters array
            let index = characters.findIndex(character => character.avatar === filteredChar.avatar);

            // If index is found, add an object with 'id' and corresponding filteredChar to the mergedArray
            if (index !== -1) {
                sortedListId.push({ id: index, ...filteredChar });
            }
        });
    }

    // Sorting the characters
    const sortedList = sortCharAR((sortedListId.length === 0 ? characters : sortedListId), sortData, sortOrder);

    // Generating characters HTML
    const htmlList = sortedList.map((item) => {
        if(sortedListId.length === 0){
            const index = characters.findIndex(character => character === item);
            return getCharBlock(index);
        } else {
            return getCharBlock(item.id);
        }
    }).join('');

    document.getElementById('character-list').innerHTML = '';
    document.getElementById('character-list').innerHTML = htmlList;
    $('#charNumber').empty().append(`Total characters : ${characters.length}`);
}

// Function to display the selected character
function selectAndDisplay(id) {

    // Check if a visible character is already selected
    if(typeof selectedId !== 'undefined' && document.getElementById(`CharDID${selectedId}`) !== null){
        document.getElementById(`CharDID${selectedId}`).classList.replace('char_selected','char_select');
    }
    setMenuType('character_edit');
    selectedId = id;

    fillDetails(id);

    document.getElementById(`CharDID${id}`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.display = 'block';
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to close the details panel
function closeDetails() {
    //const this_chid = SillyTavern.getContext().characterId;
    document.getElementById(`CharDID${selectedId}`)?.classList.replace('char_selected','char_select');
    document.getElementById('char-details').style.display = 'none';
    document.getElementById('char-sep').style.display = 'none';
}

// Function to build the modal
function openModal() {

    // Memorize some global variables
    //mem_chid = SillyTavern.getContext().characterId;
    if (SillyTavern.getContext().characterId ?? 0 > 0){
        mem_avatar = SillyTavern.getContext().characters[SillyTavern.getContext().characterId].avatar;
    } else { mem_avatar = undefined; }

    mem_menu = SillyTavern.getContext().menuType;
    displayed = true;

    // Sort the characters
    let charsList = sortCharAR(SillyTavern.getContext().characters, sortData, sortOrder);

    // Display the modal with our list layout
    $('#atm_popup').toggleClass('wide_dialogue_popup large_dialogue_popup');
    $('#character-list').empty().append(charsList.map((item) => getCharBlock(item.avatar)).join(''));
    $('#charNumber').empty().append(`Total characters : ${charsList.length}`);
    $('#atm_shadow_popup').css('display', 'block').transition({
        opacity: 1,
        duration: 125,
        easing: 'ease-in-out',
    });

    // Add listener to refresh the display on characters edit
    eventSource.on(event_types.SETTINGS_UPDATED, function () {
        if (displayed) {
            refreshCharListDebounced();
        }
    });
    // Add listener to refresh the display on characters delete
    eventSource.on('characterDeleted', function () {
        if (displayed){
            closeDetails();
            refreshCharList();
        }});

    const charSortOrderSelect = document.getElementById('char_sort_order');
    Array.from(charSortOrderSelect.options).forEach(option => {
        const field = option.getAttribute('data-field');
        const order = option.getAttribute('data-order');

        option.selected = field === sortData && order === sortOrder;
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
        refreshCharListDebounced();
    });

    // Trigger when the search bar is used
    $(document).on('input','#char_search_bar', function () {
        searchValue = String($(this).val()).toLowerCase();
        refreshCharListDebounced();
    });

    // Trigger when clicking on the separator to close the character details
    $(document).on('click', '#char-sep', function () {
        closeDetails();
    });

    $(document).on('click', '.altgreetings-drawer-toggle', function () {
        const icon = $(this).find('.inline-drawer-icon');
        icon.toggleClass('down up');
        icon.toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
        $(this).closest('.inline-drawer').children('.inline-drawer-content').stop().slideToggle();

        // Set the height of "autoSetHeight" textareas within the inline-drawer to their scroll height
        $(this).closest('.inline-drawer').find('.inline-drawer-content textarea.autoSetHeight').each(function () {
            resetScrollHeight($(this));
        });
    });

    // Trigger when the modal is closed to reset some global parameters
    //$(document).on('click', '#atm_popup_close', function () {
    $('#atm_popup_close').click( function () {
        closeDetails();
        setCharacterId(getIdByAvatar(mem_avatar));
        setMenuType(mem_menu);
        mem_avatar = undefined;

        $('#atm_shadow_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $('#atm_shadow_popup').css('display', 'none');
            $('#atm_popup').removeClass('large_dialogue_popup wide_dialogue_popup');
        }, 125);
        displayed = false;
    });

    // Import character by file
    $('#atm_character_import_button').click(function () {
        $('#character_import_file').click();
    });

    // Import character by URL
    $('#atm_external_import_button').click(function () {
        $('#external_import_button').click();
    });

    // Delete character
    $('#atm_delete_button').click(function () {
        $('#delete_button').click();
    });

    $('#desc_zone').on('input', function () {
        editCharDebounced();
    });

    $('#firstMes_zone').on('input', function () {
        editCharDebounced();
    });
});
