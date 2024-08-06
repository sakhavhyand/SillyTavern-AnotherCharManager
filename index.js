// An extension that allows you to manage characters.
import { setCharacterId, setMenuType } from '../../../../script.js';
import { resetScrollHeight } from '../../../utils.js';
import { createTagInput } from '../../../tags.js';
import { editChar, dupeChar, renameChar, exportChar } from './src/acm_characters.js';

const getTokenCount = SillyTavern.getContext().getTokenCount;
const getThumbnailUrl = SillyTavern.getContext().getThumbnailUrl;
const callPopup = SillyTavern.getContext().callPopup;
const eventSource = SillyTavern.getContext().eventSource;
const event_types = SillyTavern.getContext().eventTypes;
const characters = SillyTavern.getContext().characters;
const tagMap = SillyTavern.getContext().tagMap;
const tagList = SillyTavern.getContext().tags;
const selectCharacterById = SillyTavern.getContext().selectCharacterById;

// Initializing some variables
const extensionName = 'SillyTavern-AnotherCharManager';
const oldExtensionName = 'SillyTavern-AnotherTagManager';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const oldExtensionFolderPath = `scripts/extensions/third-party/${oldExtensionName}`;
const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 100);
const editCharDebounced = debounce( (data) => { editChar(data); }, 1000);
let selectedId;
let selectedChar;
let mem_menu;
let mem_avatar;
let displayed;
let sortOrder = 'asc';
let sortData = 'name';
let searchValue = '';
let is_acm_advanced_char_open = false;

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

// Function to generate an Array for the selected character alternative greetings
function generateGreetingArray() {
    const textareas = document.querySelectorAll('.altGreeting_zone');
    const greetingArray = [];

    textareas.forEach(textarea => {
        greetingArray.push(textarea.value);
    });
    return greetingArray;
}

// Add an event listeners to all alternative greetings textareas displayed
function addAltGreetingsTrigger(){
    document.querySelectorAll('.altGreeting_zone').forEach(textarea => {
        textarea.addEventListener('input', (event) => {saveAltGreetings(event);});
    });
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

    return `<div class="character_item ${charClass}" chid="${id}" avatar="${avatar}" id="CharDID${id}" title="[${characters[id].name} - Tags: ${tagMap[avatar].length}]">
                    <div class="avatar_item">
                        <img src="${avatarThumb}" alt="${characters[id].avatar}">
                    </div>
                    <div class="char_name">
                        <div class="char_name_block">
                            <span>${characters[id].name} : ${tagMap[avatar].length}</span>
                        </div>
                    </div>
                </div>`;
}

// Function to generate the HTML for displaying a tag
function displayTag( tagId ){
    if (tagList.find(tagList => tagList.id === tagId)) {
        const name = tagList.find(tagList => tagList.id === tagId).name;
        const color = tagList.find(tagList => tagList.id === tagId).color;

        if (tagList.find(tagList => tagList.id === tagId).color2) {
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
    else { return ''; }
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
                    <strong>
                        Greeting #
                        <span class="greeting_index">${greetingNumber}</span>
                    </strong>
                    <span class="tokens_count">Tokens: ${getTokenCount(item[i])}</span>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight">${item[i]}</textarea>
                </div>
            </div>`;
        }
        return altGreetingsHTML;
    }
}

// Function to save added/edited/deleted alternative greetings
function saveAltGreetings(event = null){
    const greetings = generateGreetingArray();
    const update = {
        avatar: selectedChar,
        data: {
            alternate_greetings: greetings,
        },
    };
    editCharDebounced(update);
    // Update token count if necessary
    if (event) {
        const textarea = event.target;
        const tokensSpan = textarea.closest('.inline-drawer-content').previousElementSibling.querySelector('.tokens_count');
        tokensSpan.textContent = `Tokens: ${getTokenCount(textarea.value)}`;
    }
}

// Function to display a new alternative greeting block
function addAltGreeting(){
    const drawerContainer = document.getElementById('altGreetings_content');

    // Determine the new greeting index
    const greetingIndex = drawerContainer.getElementsByClassName('inline-drawer').length + 1;

    // Create the new inline-drawer block
    const altGreetingDiv = document.createElement('div');
    altGreetingDiv.className = 'inline-drawer';
    altGreetingDiv.innerHTML = `<div id="altGreetDrawer${greetingIndex}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <strong>
                        Greeting #
                        <span class="greeting_index">${greetingIndex}</span>
                    </strong>
                    <span class="tokens_count">Tokens: 0</span>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight"></textarea>
                </div>
            </div>`;

    // Add the new inline-drawer block
    drawerContainer.appendChild(altGreetingDiv);

    // Add the event on the textarea
    altGreetingDiv.querySelector(`.altGreeting_zone`).addEventListener('input', (event) => {
        saveAltGreetings(event);
    });

    // Save it
    saveAltGreetings();
}

// Function to delete an alternative greetings block
function delAltGreeting(index, inlineDrawer){
    // Delete the AltGreeting block
    inlineDrawer.remove();

    // Update the others AltGreeting blocks
    $('.altgreetings-drawer-toggle').each(function() {
        const currentIndex = parseInt($(this).find('.greeting_index').text());
        if (currentIndex > index) {
            $(this).find('.greeting_index').text(currentIndex - 1);
            $(this).attr('id', `altGreetDrawer${currentIndex - 1}`);
        }
    });

    // Save it
    saveAltGreetings();
}

// Function to fill details in the character details block
function fillDetails(avatar) {
    const char = characters[getIdByAvatar(avatar)];
    const this_avatar = getThumbnailUrl('avatar', char.avatar);

    $('#avatar_title').attr('title', char.avatar);
    $('#avatar_img').attr('src', this_avatar);
    document.getElementById('ch_name_details').innerHTML = char.name;
    document.getElementById('crea_comment').innerHTML = char.creatorcomment !== undefined ? char.creatorcomment : char.data.creator_notes;
    document.getElementById('desc_Tokens').innerHTML = `Tokens: ${getTokenCount(char.description)}`;
    $('#desc_zone').val(char.description);
    document.getElementById('firstMess_tokens').innerHTML = `Tokens: ${getTokenCount(char.first_mes)}`;
    $('#firstMes_zone').val(char.first_mes);
    document.getElementById('altGreetings_number').innerHTML = `Numbers: ${char.data.alternate_greetings.length}`;
    document.getElementById('tag_List').innerHTML = `${tagMap[char.avatar].map((tag) => displayTag(tag)).join('')}`;
    createTagInput('#input_tag', '#tag_List', { tagOptions: { removable: true } });
    document.getElementById('altGreetings_content').innerHTML = displayAltGreetings(char.data.alternate_greetings);

    addAltGreetingsTrigger()
}

function fillAdvancedDefinitions(avatar) {
    const char = characters[getIdByAvatar(avatar)];

    $('#acm_character_popup-button-h3').text(char.name);
    $('#acm_creator_notes_textarea').val(char.data?.creator_notes || char.creatorcomment);
    $('#acm_character_version_textarea').val(char.data?.character_version || '');
    $('#acm_system_prompt_textarea').val(char.data?.system_prompt || '');
    $('#acm_post_history_instructions_textarea').val(char.data?.post_history_instructions || '');
    $('#acm_tags_textarea').val(Array.isArray(char.data?.tags) ? char.data.tags.join(', ') : '');
    $('#acm_creator_textarea').val(char.data?.creator);
    $('#acm_personality_textarea').val(char.personality);
    $('#acm_scenario_pole').val(char.scenario);
    $('#acm_depth_prompt_prompt').val(char.data?.extensions?.depth_prompt?.prompt ?? '');
    $('#acm_depth_prompt_depth').val(char.data?.extensions?.depth_prompt?.depth ?? depth_prompt_depth_default);
    $('#acm_depth_prompt_role').val(char.data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default);
    $('#acm_talkativeness_slider').val(char.talkativeness || talkativeness_default);
    $('#acm_mes_example_textarea').val(char.mes_example);

}

// Function to refresh the character list based on search and sorting parameters
function refreshCharList() {

    let filteredChars = [];
    const charactersCopy = [...SillyTavern.getContext().characters];

    if (searchValue !== '') {
        const searchValueLower = searchValue.toLowerCase();

        // Find matching tag IDs based on searchValue
        const matchingTagIds = tagList
            .filter(tag => tag.name.toLowerCase().includes(searchValueLower))
            .map(tag => tag.id);

        // Filter characters by description, name, creatorcomment, or tag
        filteredChars = charactersCopy.filter(item => {
            const matchesText = item.description?.toLowerCase().includes(searchValueLower) ||
                item.name?.toLowerCase().includes(searchValueLower) ||
                item.creatorcomment?.toLowerCase().includes(searchValueLower);

            const matchesTag = (tagMap[item.avatar] || []).some(tagId => matchingTagIds.includes(tagId));

            return matchesText || matchesTag;
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

    $('#acm_export_format_popup').hide();

    fillDetails(avatar);
    fillAdvancedDefinitions(avatar);

    document.getElementById(`CharDID${id}`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.display = 'block';
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to close the details panel
function closeDetails( reset = true ) {
    if(reset){ setCharacterId(getIdByAvatar(mem_avatar)); }
    selectedChar = undefined;

    $('#acm_export_format_popup').hide();

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
    $('#acm_popup').toggleClass('wide_dialogue_popup large_dialogue_popup');
    $('#character-list').empty().append(charsList.map((item) => getCharBlock(item.avatar)).join(''));
    $('#charNumber').empty().append(`Total characters : ${charsList.length}`);
    $('#acm_shadow_popup').css('display', 'block').transition({
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
    let modalHtml;
    try {
        modalHtml = await $.get(`${extensionFolderPath}/modal.html`);
    } catch (error) {
        console.error(`Error fetching modal.html from ${extensionFolderPath}. This is a normal error if you have the old folder name and you don't have to do anything.`);
        try {
            modalHtml = await $.get(`${oldExtensionFolderPath}/modal.html`);
        } catch (secondError) {
            console.error(`Error fetching modal.html from ${oldExtensionFolderPath}:`, secondError);
            return;
        }
    }
    $('#background_template').after(modalHtml);

    let acmExportPopper = Popper.createPopper(document.getElementById('acm_export_button'), document.getElementById('acm_export_format_popup'), {
        placement: 'left',
    });

    // Put the button before rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Char Manager"
    $('#rm_button_group_chats').before('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Char Manager"></button>');
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

    // Trigger when clicking on a drawer to open/close it
    $(document).on('click', '.altgreetings-drawer-toggle', function () {
        const icon = $(this).find('.idit');
        icon.toggleClass('down up');
        icon.toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
        $(this).closest('.inline-drawer').children('.inline-drawer-content').stop().slideToggle();

        // Set the height of "autoSetHeight" textareas within the inline-drawer to their scroll height
        $(this).closest('.inline-drawer').find('.inline-drawer-content textarea.autoSetHeight').each(function () {
            resetScrollHeight($(this));
        });
    });

    // Trigger when the modal is closed to reset some global parameters
    $('#acm_popup_close').on("click", function () {
        closeDetails();
        setCharacterId(getIdByAvatar(mem_avatar));
        setMenuType(mem_menu);
        mem_avatar = undefined;

        $('#acm_shadow_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $('#acm_shadow_popup').css('display', 'none');
            $('#acm_popup').removeClass('large_dialogue_popup wide_dialogue_popup');
        }, 125);
        displayed = false;
    });

    $('#acm_open_chat').on('click', function () {
        setCharacterId(undefined);
        mem_avatar = undefined;
        selectCharacterById(selectedId);
        closeDetails(false);

        $('#acm_shadow_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $('#acm_shadow_popup').css('display', 'none');
            $('#acm_popup').removeClass('large_dialogue_popup wide_dialogue_popup');
        }, 125);
        displayed = false;
    });

    // Import character by file
    $('#acm_character_import_button').on("click", function () {
        $('#character_import_file').click();
    });

    // Import character by URL
    $('#acm_external_import_button').on("click", function () {
        $('#external_import_button').click();
    });

    // Import character by file
    $('#acm_rename_button').on("click", async function () {
        const charID = getIdByAvatar(selectedChar);
        const newName = await callPopup('<h3>New name:</h3>', 'input', characters[charID].name);
        await renameChar(selectedChar, charID, newName);
    });

    // Export character
    $('#acm_export_button').on("click", function () {
        $('#acm_export_format_popup').toggle();
        acmExportPopper.update();
    });

    $(document).on('click', '.acm_export_format', function () {
        const format = $(this).data('format');
        if (!format) {
            return;
        }
        exportChar(format, selectedChar);
    });

    // Duplicate character
    $('#acm_dupe_button').on("click", async function () {
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
    $('#acm_delete_button').on("click", function () {
        $('#delete_button').click();
    });

    $('#acm_advanced_div').on("click", function () {
        if (!is_acm_advanced_char_open) {
            is_acm_advanced_char_open = true;
            $('#acm_character_popup').css({ 'display': 'flex', 'opacity': 0.0 }).addClass('open');
            $('#acm_character_popup').transition({
                opacity: 1.0,
                duration: 125,
                easing: 'ease-in-out',
            });
        } else {
            is_acm_advanced_char_open = false;
            $('#acm_character_popup').css('display', 'none').removeClass('open');
        }
    });

    $('#acm_character_cross').on("click", function () {
        is_acm_advanced_char_open = false;
        $('#character_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () { $('#acm_character_popup').css('display', 'none'); }, 125);
    });

    // Adding textarea trigger on input
    const elementsToUpdate = {
        '#desc_zone': function () { const update = { avatar: selectedChar, description: String($('#desc_zone').val()), data: { description: String($('#desc_zone').val()), },}; editCharDebounced(update);},
        '#firstMes_zone': function () { const update = { avatar: selectedChar, first_mes: String($('#firstMes_zone').val()), data: { first_mes: String($('#firstMes_zone').val()),},}; editCharDebounced(update);},
        '#acm_creator_notes_textarea': function () { const update = { avatar: selectedChar, creatorcomment: String($('#acm_creator_notes_textarea').val()), data: { creator_notes: String($('#acm_creator_notes_textarea').val()), },}; editCharDebounced(update);},
        '#acm_character_version_textarea': function () { const update = { avatar: selectedChar, data: { character_version: String($('#acm_character_version_textarea').val()), },}; editCharDebounced(update);},
        '#acm_system_prompt_textarea': function () { const update = { avatar: selectedChar, data: { system_prompt: String($('#acm_system_prompt_textarea').val()), },}; editCharDebounced(update);},
        '#acm_post_history_instructions_textarea': function () { const update = { avatar: selectedChar, data: { post_history_instructions: String($('#acm_post_history_instructions_textarea').val()), },}; editCharDebounced(update);},
        '#acm_creator_textarea': function () { const update = { avatar: selectedChar, data: { creator: String($('#acm_creator_textarea').val()), },}; editCharDebounced(update);},
        '#acm_personality_textarea': function () { const update = { avatar: selectedChar, personality: String($('#acm_personality_textarea').val()), data: { personality: String($('#acm_personality_textarea').val()), },}; editCharDebounced(update);},
        '#acm_scenario_pole': function () { const update = { avatar: selectedChar, scenario: String($('#acm_scenario_pole').val()), data: { scenario: String($('#acm_scenario_pole').val()), },}; editCharDebounced(update);},
        '#acm_depth_prompt_prompt': function () { const update = { avatar: selectedChar, data: { extensions: { depth_prompt: { prompt: String($('#acm_depth_prompt_prompt').val()),}}},}; editCharDebounced(update);},
        '#acm_depth_prompt_depth': function () { const update = { avatar: selectedChar, data: { extensions: { depth_prompt: { depth: $('#acm_depth_prompt_depth').val(),}}},}; editCharDebounced(update);},
        '#acm_depth_prompt_role': function () { const update = { avatar: selectedChar, data: { extensions: { depth_prompt: { role: String($('#acm_depth_prompt_role').val()),}}},}; editCharDebounced(update);},
        '#acm_talkativeness_slider': function () { const update = { avatar: selectedChar, talkativeness: String($('#acm_talkativeness_slider').val()), data: { extensions: { talkativeness: String($('#acm_talkativeness_slider').val()),}}}; editCharDebounced(update);},
        '#acm_mes_example_textarea': function () { const update = { avatar: selectedChar, mes_example: String($('#acm_mes_example_textarea').val()), data: { mes_example: String($('#acm_mes_example_textarea').val()), },}; editCharDebounced(update);},
        '#acm_tags_textarea': function () { const update = { avatar: selectedChar, tags: $('#acm_tags_textarea').val().split(', '), data: { tags: $('#acm_tags_textarea').val().split(', '), },}; editCharDebounced(update);}
    };

    Object.keys(elementsToUpdate).forEach(function (id) {
        $(id).on('input', function () {
                elementsToUpdate[id]();
        });
    });

    // Add a new alternative greetings
    $(document).on('click', '.fa-circle-plus', async function (event) {
        event.stopPropagation();
        addAltGreeting();
    });

    // Delete an alternative greetings
    $(document).on('click', '.fa-circle-minus', function (event) {
        event.stopPropagation();
        const inlineDrawer = this.closest('.inline-drawer');
        const greetingIndex = parseInt(this.closest('.altgreetings-drawer-toggle').querySelector('.greeting_index').textContent);
        delAltGreeting(greetingIndex, inlineDrawer);
    });
});
