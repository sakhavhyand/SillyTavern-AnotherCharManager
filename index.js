// An extension that allows you to manage tags.
import { setCharacterId, setMenuType } from '../../../../script.js';
import { resetScrollHeight } from '../../../utils.js';
import { createTagInput } from '../../../tags.js';
import { editChar, dupeChar, renameChar, exportChar } from './src/atm_characters.js';

const getTokenCount = SillyTavern.getContext().getTokenCount;
const getThumbnailUrl = SillyTavern.getContext().getThumbnailUrl;
const callPopup = SillyTavern.getContext().callPopup;
const eventSource = SillyTavern.getContext().eventSource;
const event_types = SillyTavern.getContext().eventTypes;
const characters = SillyTavern.getContext().characters;
const tagMap = SillyTavern.getContext().tagMap;
const tagList = SillyTavern.getContext().tags;

// Initializing some variables
const extensionName = 'SillyTavern-AnotherTagManager';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 100);
const editCharDebounced = debounce((data) => { editChar(data); }, 1000);
let selectedId;
let selectedChar;
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

// Function to get the ID of a character using its avatar
function getIdByAvatar(avatar){
    const index = characters.findIndex(character => character.avatar === avatar);
    return index !== -1 ? String(index) : undefined;
}

// Function to sort the character array based on specified property and order
function sortCharAR(chars, sort_data, sort_order) {
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
    const id = getIdByAvatar(avatar);
    const avatarThumb = getThumbnailUrl('avatar', avatar);

    const parsedThis_avatar = selectedChar !== undefined ? selectedChar : undefined;
    const charClass = (parsedThis_avatar !== undefined && parsedThis_avatar === avatar) ? 'char_selected' : 'char_select';

    return `<div class="character_item ${charClass}" chid="${id}" avatar="${avatar}" id="CharDID${id}">
                    <div class="avatar_item">
                        <img src="${avatarThumb}" alt="${characters[id].avatar}">
                    </div>
                    <div class="char_name">${characters[id].name} : ${tagMap[avatar].length}</div>
                </div>`;
}

// Function to generate the HTML for displaying a tag
function displayTag( tagId ){
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

// Function to Display the AltGreetings if they exists
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
    const char = characters[id];
    const this_avatar = getThumbnailUrl('avatar', char.avatar);

    $('#avatar_title').attr('title', char.avatar);
    $('#avatar_img').attr('src', this_avatar);
    document.getElementById('ch_name_details').innerHTML = char.name;
    document.getElementById('crea_comment').innerHTML = char.creatorcomment;
    document.getElementById('tag_List').innerHTML = `${tagMap[char.avatar].map((tag) => displayTag(tag)).join('')}`;
    createTagInput('#input_tag', '#tag_List', { tagOptions: { removable: true } });
    document.getElementById('desc_Tokens').innerHTML = `Tokens: ${getTokenCount(char.description)}`;
    $('#desc_zone').val(char.description);
    document.getElementById('firstMess_tokens').innerHTML = `Tokens: ${getTokenCount(char.first_mes)}`;
    $('#firstMes_zone').val(char.first_mes);
    document.getElementById('altGreetings_number').innerHTML = `Numbers: ${char.data.alternate_greetings.length}`;
    document.getElementById('altGreetings_content').innerHTML = displayAltGreetings(char.data.alternate_greetings);
}

// Function to refresh the character list based on search and sorting parameters
function refreshCharList() {

    let filteredChars = [];
    const charactersCopy = [...SillyTavern.getContext().characters];

    // Filtering only if there is more than three chars in the searchbar
    if(searchValue !== ''){
        filteredChars = charactersCopy.filter(item => {
            return item.description?.toLowerCase().includes(searchValue) ||
                item.name?.toLowerCase().includes(searchValue) ||
                item.creatorcomment?.toLowerCase().includes(searchValue);
        });
    }

    const sortedList = sortCharAR((filteredChars.length === 0 ? charactersCopy : filteredChars), sortData, sortOrder);
    document.getElementById('character-list').innerHTML = sortedList.map((item) => getCharBlock(item.avatar)).join('');
    $('#charNumber').empty().append(`Total characters : ${charactersCopy.length}`);
}

// Function to display the selected character
function selectAndDisplay(id, avatar) {

    // Check if a visible character is already selected
    if(typeof selectedId !== 'undefined' && document.getElementById(`CharDID${selectedId}`) !== null){
        document.getElementById(`CharDID${selectedId}`).classList.replace('char_selected','char_select');
    }
    setMenuType('character_edit');
    selectedId = id;
    selectedChar = avatar;
    setCharacterId(getIdByAvatar(avatar));

    $('#atm_export_format_popup').hide();

    fillDetails(id);

    document.getElementById(`CharDID${id}`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.display = 'block';
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to close the details panel
function closeDetails() {
    setCharacterId(getIdByAvatar(mem_avatar));
    selectedChar = undefined;

    $('#atm_export_format_popup').hide();

    document.getElementById(`CharDID${selectedId}`)?.classList.replace('char_selected','char_select');
    document.getElementById('char-details').style.display = 'none';
    document.getElementById('char-sep').style.display = 'none';
    selectedId = undefined;
}

// Function to build the modal
function openModal() {

    // Memorize some global variables
    if (SillyTavern.getContext().characterId !== undefined && SillyTavern.getContext().characterId >= 0) {
        mem_avatar = characters[SillyTavern.getContext().characterId].avatar;
    } else {
        mem_avatar = undefined;
    }
    mem_menu = SillyTavern.getContext().menuType;
    displayed = true;

    // Sort the characters
    let charsList = sortCharAR([...SillyTavern.getContext().characters], sortData, sortOrder);

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
    eventSource.on(event_types.CHARACTER_EDITED, function () {
        if (displayed) {
            refreshCharListDebounced();
        }
    });
    // Add listener to refresh the display on tags edit
    eventSource.on('character_page_loaded', function () {
        if (displayed){
            refreshCharListDebounced();
        }});
    // Add listener to refresh the display on characters delete
    eventSource.on('characterDeleted', function () {
        if (displayed){
            closeDetails();
            refreshCharListDebounced();
        }});
    // Add listener to refresh the display on characters duplication
    eventSource.on(event_types.CHARACTER_DUPLICATED, function () {
        if (displayed) {
            refreshCharListDebounced();
        }
    });

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

    let atmExportPopper = Popper.createPopper(document.getElementById('atm_export_button'), document.getElementById('atm_export_format_popup'), {
        placement: 'left',
    });

    // Put the button before rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#rm_button_group_chats').before('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openModal();
    });

    // Trigger when a character is selected in the list
    $(document).on('click', '.char_select', function () {
        selectAndDisplay($(this).attr('chid'), $(this).attr('avatar'));
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

    // Import character by file
    $('#atm_rename_button').click(async function () {
        const charID = getIdByAvatar(selectedChar);
        const newName = await callPopup('<h3>New name:</h3>', 'input', characters[charID].name);
        renameChar(selectedChar, charID, newName);
    });

    // Export character
    $('#atm_export_button').click(function () {
        $('#atm_export_format_popup').toggle();
        atmExportPopper.update();
    });

    $(document).on('click', '.atm_export_format', function () {
        const format = $(this).data('format');

        if (!format) {
            return;
        }
        exportChar(format, selectedChar);
    });

    // Duplicate character
    $('#atm_dupe_button').click(async function () {
        if (!selectedChar) {
            toastr.warning('You must first select a character to duplicate!');
            return;
        }

        const confirmMessage = `
            <h3>Are you sure you want to duplicate this character?</h3>
            <span>If you just want to start a new chat with the same character, use "Start new chat" option in the bottom-left options menu.</span><br><br>`;

        const confirm = await callPopup(confirmMessage, 'confirm');

        if (!confirm) {
            console.log('User cancelled duplication');
            return;
        }
        await dupeChar(selectedChar);
    });

    // Delete character
    $('#atm_delete_button').click(function () {
        $('#delete_button').click();
    });

    $('#desc_zone').on('input', function () {
        const update = {
            avatar: selectedChar,
            description: this.value,
            data: {
                description: this.value,
            },
        };
        editCharDebounced(update);
    });

    $('#firstMes_zone').on('input', function () {
        const update = {
            avatar: selectedChar,
            first_mes: this.value,
            data: {
                first_mes: this.value,
            },
        };
        editCharDebounced(update);
    });
});
