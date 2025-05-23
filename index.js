// An extension that allows you to manage characters.
import { setCharacterId, setMenuType, depth_prompt_depth_default, depth_prompt_role_default, talkativeness_default, } from '../../../../script.js';
import { createTagInput } from '../../../tags.js';
import { editCharDebounced, replaceAvatar, dupeChar, renameChar, exportChar, checkApiAvailability } from './src/acm_characters.js';
import {
    manageCustomCategories,
    printCategoriesList,
    addCategory,
    removeCategory,
    renameCategory,
    removeTagFromCategory,
    dropdownAllTags, dropdownCustom, dropdownCreators, renamePreset, updatePresetNames
} from './src/acm_dropdownUI.js';
import { displayTag, generateTagFilter, addListenersTagFilter } from './src/acm_tags.js';
import { addAltGreetingsTrigger, addAltGreeting, delAltGreeting, displayAltGreetings } from './src/acm_altGreetings.js';
import { debounce, getBase64Async, resetScrollHeight } from './src/acm_tools.js';

const getContext = SillyTavern.getContext;
const power_user = getContext().powerUserSettings;
const getTokenCount = getContext().getTokenCount;
const getThumbnailUrl = getContext().getThumbnailUrl;
const callPopup = getContext().callGenericPopup;
const eventSource = getContext().eventSource;
const event_types = getContext().eventTypes;
const characters = getContext().characters;
const unshallowCharacter = getContext().unshallowCharacter;
const tagMap = getContext().tagMap;
const tagList = getContext().tags;
const selectCharacterById = getContext().selectCharacterById;
const Popup = getContext().Popup;
const POPUP_TYPE = getContext().POPUP_TYPE;
const substituteParams = getContext().substituteParams;
const extensionSettings = getContext().extensionSettings;
const saveSettingsDebounced = getContext().saveSettingsDebounced;

// Initializing some variables
const extensionName = 'SillyTavern-AnotherCharManager';
const oldExtensionName = 'SillyTavern-AnotherTagManager';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const oldExtensionFolderPath = `scripts/extensions/third-party/${oldExtensionName}`;
const defaultSettings = {
    sortingField: "name",
    sortingOrder: "asc",
    favOnly: false,
    dropdownUI: false,
    dropdownMode: "allTags",
    dropdownPresets: [
        { name: "Preset 1", categories: [] },
        { name: "Preset 2", categories: [] },
        { name: "Preset 3", categories: [] },
        { name: "Preset 4", categories: [] },
        { name: "Preset 5", categories: [] }
    ]};
const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 200);
export let selectedChar;
let mem_menu, mem_avatar;
let searchValue = '';
export const tagFilterstates = new Map();

// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
    //Create the settings if they don't exist
    extensionSettings.acm = extensionSettings.acm || {};
    // Add default settings for any missing keys
    for (const key in defaultSettings) {
        if (!extensionSettings.acm.hasOwnProperty(key)) {
            extensionSettings.acm[key] = defaultSettings[key];
        }
    }
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
export function getCharBlock(avatar) {
    const id = getIdByAvatar(avatar);
    const avatarThumb = getThumbnailUrl('avatar', avatar);
    let isFav;

    const parsedThis_avatar = selectedChar !== undefined ? selectedChar : undefined;
    const charClass = (parsedThis_avatar !== undefined && parsedThis_avatar === avatar) ? 'char_selected' : 'char_select';
    if ( characters[id].fav || characters[id].data.extensions.fav ) {
        isFav = 'fav';
    }
    else {
        isFav = '';
    }

    return `<div class="character_item ${charClass} ${isFav}" title="[${characters[id].name} - Tags: ${tagMap[avatar].length}]" data-avatar="${avatar}">
                    <div class="avatar_item">
                        <img id="img_${avatar}" src="${avatarThumb}" alt="${characters[id].avatar}" draggable="false">
                    </div>
                    <div class="char_name">
                        <div class="char_name_block">
                            <span>${characters[id].name} : ${tagMap[avatar].length}</span>
                        </div>
                    </div>
                </div>`;
}

// Function to fill details in the character details block
async function fillDetails(avatar) {
    if (typeof characters[getIdByAvatar(avatar)].data.alternate_greetings === 'undefined') {
        await unshallowCharacter(getIdByAvatar(avatar));
    }
    const char = characters[getIdByAvatar(avatar)];
    const avatarThumb = getThumbnailUrl('avatar', char.avatar);

    $('#avatar_title').attr('title', char.avatar);
    $('#avatar_img').attr('src', avatarThumb);
    $('#ch_name_details').text(char.name);
    $('#ch_infos_creator').text(`Creator: ${char.data.creator ? char.data.creator : (char.data.extensions.chub?.full_path?.split('/')[0] ?? " - ")}`);
    $('#ch_infos_version').text(`Version: ${char.data.character_version ?? " - "}`);
    const dateString = char.create_date?.split("@")[0] ?? " - ";
    const [year, month, day] = dateString.split("-");
    const formattedDateString = year === " - " ? " - " : `${year}-${month.padStart(2, "0")}-${day.trim().padStart(2, "0")}`;
    $('#ch_infos_date').text(`Created: ${formattedDateString}`);
    $('#ch_infos_lastchat').text(`Last chat: ${char.date_last_chat ? new Date(char.date_last_chat).toISOString().substring(0, 10) : " - "}`);
    $('#ch_infos_adddate').text(`Added: ${char.date_added ? new Date(char.date_added).toISOString().substring(0, 10) : " - "}`);
    $('#ch_infos_link').html(char.data.extensions.chub?.full_path ? `Link: <a href="https://chub.ai/${char.data.extensions.chub.full_path}" target="_blank">Chub</a>` : "Link: -");
    const tokens = getTokenCount(substituteParams(char.name)) +
                            getTokenCount(substituteParams(char.description)) +
                            getTokenCount(substituteParams(char.first_mes)) +
                            getTokenCount(substituteParams(char.data?.extensions?.depth_prompt?.prompt ?? '')) +
                            getTokenCount(substituteParams(char.data?.post_history_instructions || '')) +
                            getTokenCount(substituteParams(char.personality)) +
                            getTokenCount(substituteParams(char.scenario)) +
                            getTokenCount(substituteParams(char.data?.extensions?.depth_prompt?.prompt ?? '')) +
                            getTokenCount(substituteParams(char.mes_example));
    $('#ch_infos_tokens').text(`Tokens: ${tokens}`);
    const permTokens = getTokenCount(substituteParams(char.name)) +
        getTokenCount(substituteParams(char.description)) +
        getTokenCount(substituteParams(char.personality)) +
        getTokenCount(substituteParams(char.scenario)) +
        getTokenCount(substituteParams(char.data?.extensions?.depth_prompt?.prompt ?? ''));
    $('#ch_infos_permtokens').text(`Perm. Tokens: ${permTokens}`);
    $('#desc_Tokens').text(`Tokens: ${getTokenCount(substituteParams(char.description))}`);
    $('#desc_zone').val(char.description);
    $('#firstMess_tokens').text(`Tokens: ${getTokenCount(substituteParams(char.first_mes))}`);
    $('#firstMes_zone').val(char.first_mes);
    $('#altGreetings_number').text(`Numbers: ${char.data.alternate_greetings?.length ?? 0}`);
    $('#tag_List').html(`${tagMap[char.avatar].map((tag) => displayTag(tag)).join('')}`);
    createTagInput('#input_tag', '#tag_List', { tagOptions: { removable: true } });
    $('#altGreetings_content').html(displayAltGreetings(char.data.alternate_greetings));
    $('#acm_favorite_button').toggleClass('fav_on', char.fav || char.data.extensions.fav).toggleClass('fav_off', !(char.fav || char.data.extensions.fav));

    addAltGreetingsTrigger()
}

function fillAdvancedDefinitions(avatar) {
    const char = characters[getIdByAvatar(avatar)];

    $('#acm_character_popup-button-h3').text(char.name);
    $('#acm_creator_notes_textarea').val(char.data?.creator_notes || char.creatorcomment);
    $('#acm_character_version_textarea').val(char.data?.character_version || '');
    $('#acm_system_prompt_textarea').val(char.data?.system_prompt || '');
    $('#acm_main_prompt_tokens').text(`Tokens: ${getTokenCount(substituteParams(char.data?.system_prompt || ''))}`);
    $('#acm_post_history_instructions_textarea').val(char.data?.post_history_instructions || '');
    $('#acm_post_tokens').text(`Tokens: ${getTokenCount(substituteParams(char.data?.post_history_instructions || ''))}`);
    $('#acm_tags_textarea').val(Array.isArray(char.data?.tags) ? char.data.tags.join(', ') : '');
    $('#acm_creator_textarea').val(char.data?.creator);
    $('#acm_personality_textarea').val(char.personality);
    $('#acm_personality_tokens').text(`Tokens: ${getTokenCount(substituteParams(char.personality))}`);
    $('#acm_scenario_pole').val(char.scenario);
    $('#acm_scenario_tokens').text(`Tokens: ${getTokenCount(substituteParams(char.scenario))}`);
    $('#acm_depth_prompt_prompt').val(char.data?.extensions?.depth_prompt?.prompt ?? '');
    $('#acm_char_notes_tokens').text(`Tokens: ${getTokenCount(substituteParams(char.data?.extensions?.depth_prompt?.prompt ?? ''))}`);
    $('#acm_depth_prompt_depth').val(char.data?.extensions?.depth_prompt?.depth ?? depth_prompt_depth_default);
    $('#acm_depth_prompt_role').val(char.data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default);
    $('#acm_talkativeness_slider').val(char.talkativeness || talkativeness_default);
    $('#acm_mes_example_textarea').val(char.mes_example);
    $('#acm_messages_examples').text(`Tokens: ${getTokenCount(substituteParams(char.mes_example))}`);

}

function searchAndFilter(){
    let filteredChars = [];
    const charactersCopy = extensionSettings.acm.favOnly
        ? [...getContext().characters].filter(character => character.fav === true || character.data.extensions.fav === true)
        : [...getContext().characters];

    // Get tags states
    const tagStates = [...tagFilterstates.entries()];

    // Split included and excluded tags
    const includedTagIds = tagList
        .filter(tag => tagStates.find(([id, state]) => id === tag.id && state === 2))
        .map(tag => tag.id);

    const excludedTagIds = tagList
        .filter(tag => tagStates.find(([id, state]) => id === tag.id && state === 3))
        .map(tag => tag.id);

    // Filtering based on tags states
    let tagfilteredChars = charactersCopy.filter(item => {
        const characterTags = tagMap[item.avatar] || [];

        // Check if there is included tags
        const hasIncludedTag = includedTagIds.length === 0 || characterTags.some(tagId => includedTagIds.includes(tagId));

        // Check if there is excluded tags
        const hasExcludedTag = characterTags.some(tagId => excludedTagIds.includes(tagId));

        // Return true if :
        // 1. There is no excluded tags
        // 2. There is at least one included tags
        return hasIncludedTag && !hasExcludedTag;
    });

    if (searchValue !== '') {
        const searchValueLower = searchValue.trim().toLowerCase();

        // Find matching tag IDs based on searchValue
        const matchingTagIds = tagList
            .filter(tag => tag.name.toLowerCase().includes(searchValueLower))
            .map(tag => tag.id);

        // Filter characters by description, name, creator comment, or tag
        filteredChars = tagfilteredChars.filter(item => {
            const matchesText = item.description?.toLowerCase().includes(searchValueLower) ||
                item.name?.toLowerCase().includes(searchValueLower) ||
                item.creatorcomment?.toLowerCase().includes(searchValueLower);

            const matchesTag = (tagMap[item.avatar] || []).some(tagId => matchingTagIds.includes(tagId));

            return matchesText || matchesTag;
        });
        return filteredChars;
    }
    else {
        return tagfilteredChars;
    }
}

// Function to refresh the character list based on search and sorting parameters
export function refreshCharList() {
    const filteredChars = searchAndFilter();
    if(filteredChars.length === 0){
        $('#character-list').html(`<span>Hmm, it seems like the character you're looking for is hiding out in a secret lair. Try searching for someone else instead.</span>`);
    }
    else {
        const sortedList = sortCharAR(filteredChars, extensionSettings.acm.sortingField, extensionSettings.acm.sortingOrder);
        if(extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode === "allTags"){
            $('#character-list').html(dropdownAllTags(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else if(extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode === "custom"){
            $('#character-list').html(dropdownCustom(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else if(extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode === "creators"){
            $('#character-list').html(dropdownCreators(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else {
            $('#character-list').html(sortedList.map((item) => getCharBlock(item.avatar)).join(''));
        }
    }
    $('#charNumber').empty().append(`Total characters : ${getContext().characters.length}`);
}

// Function to display the selected character
function selectAndDisplay(avatar) {

    // Check if a visible character is already selected
    if(typeof selectedChar !== 'undefined' && document.querySelector(`[data-avatar="${selectedChar}"]`) !== null){
        document.querySelector(`[data-avatar="${selectedChar}"]`).classList.replace('char_selected','char_select');
    }
    setMenuType('character_edit');
    selectedChar = avatar;
    setCharacterId(getIdByAvatar(avatar));

    $('#acm_export_format_popup').hide();

    fillDetails(avatar);
    fillAdvancedDefinitions(avatar);

    document.querySelector(`[data-avatar="${avatar}"]`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.display = 'block';
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to replace the avatar by a new one
async function update_avatar(input){
    if (input.files && input.files[0]) {

        let crop_data = undefined;
        const file = input.files[0];
        const fileData = await getBase64Async(file);

        if (!power_user.never_resize_avatars) {
            const dlg = new Popup('Set the crop position of the avatar image', POPUP_TYPE.CROP, '', { cropImage: fileData });
            const croppedImage = await dlg.show();

            if (!croppedImage) {
                return;
            }
            crop_data = dlg.cropData;

            try {
               await replaceAvatar(file, getIdByAvatar(selectedChar), crop_data);
                // Firefox tricks
                const newImageUrl = getThumbnailUrl('avatar', selectedChar) + '&t=' + new Date().getTime();
                $('#avatar_img').attr('src', newImageUrl);
                //$(`#${selectedChar}`).attr('src', newImageUrl);
                $(`[data-avatar="${selectedChar}"]`).attr('src', newImageUrl);
            } catch {
                toast.error("Something went wrong.");
            }
        } else {
            try {
                await replaceAvatar(file, getIdByAvatar(selectedChar));
                // Firefox tricks
                const newImageUrl = getThumbnailUrl('avatar', selectedChar) + '&t=' + new Date().getTime();
                $('#avatar_img').attr('src', newImageUrl);
                //$(`#${selectedChar}`).attr('src', newImageUrl);
                $(`[data-avatar="${selectedChar}"]`).attr('src', newImageUrl);
            } catch {
                toast.error("Something went wrong.");
            }
        }
    }
}

// Function to close the details panel
function closeDetails( reset = true ) {
    if(reset){ setCharacterId(getIdByAvatar(mem_avatar)); }

    $('#acm_export_format_popup').hide();
    document.querySelector(`[data-avatar="${selectedChar}"]`)?.classList.replace('char_selected','char_select');
    document.getElementById('char-details').style.display = 'none';
    document.getElementById('char-sep').style.display = 'none';
    selectedChar = undefined;
}

// Function to build the modal
function openModal() {

    // Memorize some global variables
    if (getContext().characterId !== undefined && getContext().characterId >= 0) {
        mem_avatar = characters[getContext().characterId].avatar;
    } else {
        mem_avatar = undefined;
    }
    mem_menu = getContext().menuType;

    // Display the modal with our list layout
    $('#acm_popup').toggleClass('wide_dialogue_popup large_dialogue_popup');
    $('#acm_shadow_popup').css('display', 'block').transition({
        opacity: 1,
        duration: 125,
        easing: 'ease-in-out',
    });

    const charSortOrderSelect = document.getElementById('char_sort_order');
    Array.from(charSortOrderSelect.options).forEach(option => {
        const field = option.getAttribute('data-field');
        const order = option.getAttribute('data-order');

        option.selected = field === extensionSettings.acm.sortingField && order === extensionSettings.acm.sortingOrder;
    });
    document.getElementById('favOnly_checkbox').checked = extensionSettings.acm.favOnly;
}

jQuery(async () => {

    await loadSettings();

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

    updatePresetNames();

    let acmExportPopper = Popper.createPopper(document.getElementById('acm_export_button'), document.getElementById('acm_export_format_popup'), {
        placement: 'left',
    });
    let acmUIPopper = Popper.createPopper(document.getElementById('acm_switch_ui'), document.getElementById('dropdown-ui-menu'), {
        placement: 'top',
    });
    let acmUISubPopper = Popper.createPopper(document.getElementById('acm_dropdown_sub'), document.getElementById('dropdown-submenu'), {
        placement: 'right',
    });
    let acmUIPresetPopper = Popper.createPopper(document.getElementById('acm_dropdown_cat'), document.getElementById('preset-submenu'), {
        placement: 'right',
    });

    // Switch UI
    $('#acm_switch_ui').on("click", function () {
        $('#dropdown-ui-menu').toggle();
        acmUIPopper.update();
    });

    $('#acm_dropdown_sub').on("click", function () {
        $('#dropdown-submenu').toggle();
        acmUISubPopper.update();
    });

    $('#acm_dropdown_cat').on("click", function () {
        $('#preset-submenu').toggle();
        acmUIPresetPopper.update();
    });

    $('#acm_switch_classic').on("click", function () {
        if (extensionSettings.acm.dropdownUI) {
            extensionSettings.acm.dropdownUI = false;
            saveSettingsDebounced();
            refreshCharList();
        }
        $('#dropdown-ui-menu').toggle();
        acmUIPopper.update();
        $('#dropdown-submenu').toggle(false);
        acmUISubPopper.update();
        $('#preset-submenu').toggle(false);
        acmUIPresetPopper.update();
    });

    $('#acm_switch_alltags').on("click", function () {
        if (!extensionSettings.acm.dropdownUI || (extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode !== 'allTags')) {
            extensionSettings.acm.dropdownUI = true;
            extensionSettings.acm.dropdownMode = "allTags";
            saveSettingsDebounced();
            refreshCharList();
        }
        $('#dropdown-ui-menu').toggle();
        acmUIPopper.update();
        $('#dropdown-submenu').toggle(false);
        acmUISubPopper.update();
        $('#preset-submenu').toggle(false);
        acmUIPresetPopper.update();
    });

    $('#acm_switch_creators').on("click", function () {
        if (!extensionSettings.acm.dropdownUI || (extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode !== 'creators')) {
            extensionSettings.acm.dropdownUI = true;
            extensionSettings.acm.dropdownMode = "creators";
            saveSettingsDebounced();
            refreshCharList();
        }
        $('#dropdown-ui-menu').toggle();
        acmUIPopper.update();
        $('#dropdown-submenu').toggle(false);
        acmUISubPopper.update();
        $('#preset-submenu').toggle(false);
        acmUIPresetPopper.update();
    });

    $('#acm_manage_categories').on("click", function () {
        $('#dropdown-ui-menu').toggle();
        acmUIPopper.update();
        $('#dropdown-submenu').toggle(false);
        acmUISubPopper.update();
        $('#preset-submenu').toggle(false);
        acmUIPresetPopper.update();
        manageCustomCategories();
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        if(extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode === 'custom'){$('.popup-button-ok').on('click', function () {refreshCharList();});}
        printCategoriesList(selectedPreset,true)
    });

    $(document).on('click', '[data-ui="preset"]', function () {
        if (!extensionSettings.acm.dropdownUI
            || (extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode !== 'custom')
            || (extensionSettings.acm.dropdownUI && extensionSettings.acm.dropdownMode === 'custom' && extensionSettings.acm.customPreset !== $(this).data('preset'))
        ) {
            extensionSettings.acm.dropdownUI = true;
            extensionSettings.acm.dropdownMode = "custom";
            extensionSettings.acm.customPreset = $(this).data('preset');
            saveSettingsDebounced();
            refreshCharList();
        }
        $('#dropdown-ui-menu').toggle();
        acmUIPopper.update();
        $('#dropdown-submenu').toggle(false);
        acmUISubPopper.update();
        $('#preset-submenu').toggle(false);
        acmUIPresetPopper.update();
    })

    // Close Popper menu when clicking outside
    document.addEventListener('click', (event) => {
        const menuElements = [
            document.getElementById('dropdown-ui-menu'),
            document.getElementById('dropdown-submenu'),
            document.getElementById('preset-submenu'),
            document.getElementById('acm_switch_ui')
        ];

        if (!menuElements.some(menu => menu && menu.contains(event.target))) {
            document.getElementById('dropdown-ui-menu').style.display = 'none';
            document.getElementById('dropdown-submenu').style.display = 'none';
            document.getElementById('preset-submenu').style.display = 'none';
        }
        if (!document.getElementById('acm_export_format_popup').contains(event.target) && !document.getElementById('acm_export_button').contains(event.target)) {
            document.getElementById('acm_export_format_popup').style.display = 'none';
        }
    });

    // Put the button before rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Char Manager"
    $('#rm_button_group_chats').before('<button id="tag-manager" class="menu_button fa-solid fa-users faSmallFontSquareFix" title="Open Char Manager"></button>');
    $('#tag-manager').on('click', function () {
        openModal();
    });

    // Add listener to refresh the display on characters edit
    eventSource.on('character_edited', function () {
        refreshCharListDebounced();
    });
    // Add listener to refresh the display on characters delete
    eventSource.on('characterDeleted', function () {
        let charDetailsState = document.getElementById('char-details');
        if (charDetailsState.style.display === 'none') {
            refreshCharListDebounced();
        } else {
            closeDetails();
            refreshCharListDebounced();
        }
    });
    // Add listener to refresh the display on characters duplication
    eventSource.on(event_types.CHARACTER_DUPLICATED, function () {
        refreshCharListDebounced();
    });
    // Load the characters list in background when ST launch
    eventSource.on('character_page_loaded', function () {
        generateTagFilter();
        addListenersTagFilter();
        refreshCharList();
    });

    // Trigger when a character is selected in the list
    $(document).on('click', '.char_select', function () {
        selectAndDisplay(this.dataset.avatar);
    });

    // Add trigger to open/close tag list for filtering
    $(document).on('click', '#acm_tags_filter', function () {
        const tagsList = document.getElementById('tags-list');

        // Check if div already opened
        if (tagsList.classList.contains('open')) {
            setTimeout(() => {
                tagsList.style.minHeight = '0';
                tagsList.style.height = '0';
            }, 10);
            tagsList.classList.toggle('open');
        } else {
            setTimeout(() => {
                tagsList.style.minHeight  = tagsList.scrollHeight > 80 ? '80px' : (tagsList.scrollHeight + 5) + 'px';
                tagsList.style.height = tagsList.style.minHeight;
            }, 10);
            tagsList.classList.toggle('open');
        }
    });

    // Trigger when the sort dropdown is used
    $(document).on('change', '#char_sort_order', function () {
        extensionSettings.acm.sortingField = $(this).find(':selected').data('field');
        extensionSettings.acm.sortingOrder = $(this).find(':selected').data('order');
        saveSettingsDebounced();
        refreshCharListDebounced();
    });

    // Trigger when the search bar is used
    $(document).on('input', '#char_search_bar', function () {
        searchValue = String($(this).val()).toLowerCase();
        refreshCharListDebounced();
    });

    $('#favOnly_checkbox').on("change", function () {
        if (this.checked) {
            extensionSettings.acm.favOnly = true;
            saveSettingsDebounced();
            refreshCharListDebounced();
        } else {
            extensionSettings.acm.favOnly = false;
            saveSettingsDebounced();
            refreshCharListDebounced();
        }
    });

    // Trigger when clicking on the separator to close the character details
    $(document).on('click', '#char-sep', function () {
        closeDetails();
    });

    // Trigger when clicking on a drawer to open/close it
    $(document).on('click', '.altgreetings-drawer-toggle', function () {
        const icon = $(this).find('.idit');
        icon.toggleClass('down up').toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
        $(this).closest('.inline-drawer').children('.inline-drawer-content').stop().slideToggle();

        // Set the height of "autoSetHeight" text areas within the inline-drawer to their scroll height
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
    });

    // Trigger when the favorites button is clicked
    $('#acm_favorite_button').on('click', function () {
        const id = getIdByAvatar(selectedChar);
        if (characters[id].fav || characters[id].data.extensions.fav) {
            const update = { avatar: selectedChar, fav: false, data: { extensions: { fav: false } } };
            editCharDebounced(update);
            $('#acm_favorite_button')[0].classList.replace('fav_on', 'fav_off');
        } else {
            const update = { avatar: selectedChar, fav: true, data: { extensions: { fav: true } } };
            editCharDebounced(update);
            $('#acm_favorite_button')[0].classList.replace('fav_off', 'fav_on');
        }
    });

    // Trigger when the Open Chat button is clicked
    $('#acm_open_chat').on('click', function () {
        setCharacterId(undefined);
        mem_avatar = undefined;
        selectCharacterById(getIdByAvatar(selectedChar));
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
    });

    // Import character by file
    $('#acm_character_import_button').on("click", function () {
        $('#character_import_file').trigger("click");
    });

    // Import character by URL
    $('#acm_external_import_button').on("click", function () {
        $('#external_import_button').trigger("click");
    });

    // Import character by file
    $('#acm_rename_button').on("click", async function () {
        const charID = getIdByAvatar(selectedChar);
        const newName = await callPopup('<h3>New name:</h3>', POPUP_TYPE.INPUT, characters[charID].name);
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

        const confirm = await callPopup(confirmMessage, POPUP_TYPE.CONFIRM);

        if (!confirm) {
            console.log('User cancelled duplication');
            return;
        }
        await dupeChar(selectedChar);
    });

    // Delete character
    $('#acm_delete_button').on("click", function () {
        $('#delete_button').trigger("click");
    });

    $('#acm_advanced_div').on("click", function () {
        const $popup = $('#acm_character_popup');
        if ($popup.css('display') === 'none') {
            $popup.css({ 'display': 'flex', 'opacity': 0.0 }).addClass('open').transition({
                opacity: 1.0,
                duration: 125,
                easing: 'ease-in-out',
            });
        } else {
            $popup.css('display', 'none').removeClass('open');
        }
    });

    $('#acm_character_cross').on("click", function () {
        $('#character_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () { $('#acm_character_popup').css('display', 'none'); }, 125);
    });

    // Adding textarea trigger on input
    const elementsToUpdate = {
        '#desc_zone': function () {const descZone=$('#desc_zone');const update={avatar:selectedChar,description:String(descZone.val()),data:{description:String(descZone.val()),},};editCharDebounced(update);$('#desc_Tokens').html(`Tokens: ${getTokenCount(substituteParams(String(descZone.val())))}`);},
        '#firstMes_zone': function () {const firstMesZone=$('#firstMes_zone');const update={avatar:selectedChar,first_mes:String(firstMesZone.val()),data:{first_mes:String(firstMesZone.val()),},};editCharDebounced(update);$('#firstMess_tokens').html(`Tokens: ${getTokenCount(substituteParams(String(firstMesZone.val())))}`);},
        '#acm_creator_notes_textarea': function () {const creatorNotes=$('#acm_creator_notes_textarea');const update={avatar:selectedChar,creatorcomment:String(creatorNotes.val()),data:{creator_notes:String(creatorNotes.val()),},};editCharDebounced(update);},
        '#acm_character_version_textarea': function () { const update = {avatar:selectedChar,data:{character_version:String($('#acm_character_version_textarea').val()),},};editCharDebounced(update);},
        '#acm_system_prompt_textarea': function () {const sysPrompt=$('#acm_system_prompt_textarea');const update={avatar:selectedChar,data:{system_prompt:String(sysPrompt.val()),},};editCharDebounced(update);$('#acm_main_prompt_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(sysPrompt.val())))}`);},
        '#acm_post_history_instructions_textarea': function () {const postHistory=$('#acm_post_history_instructions_textarea');const update={avatar:selectedChar,data:{post_history_instructions:String(postHistory.val()),},};editCharDebounced(update);$('#acm_post_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(postHistory.val())))}`);},
        '#acm_creator_textarea': function () {const update={ avatar:selectedChar,data:{creator:String($('#acm_creator_textarea').val()),},};editCharDebounced(update);},
        '#acm_personality_textarea': function () {const personality=$('#acm_personality_textarea');const update={avatar:selectedChar,personality:String(personality.val()),data:{personality:String(personality.val()),},};editCharDebounced(update);$('#acm_personality_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(personality.val())))}`);},
        '#acm_scenario_pole': function () {const scenario=$('#acm_scenario_pole');const update={avatar:selectedChar,scenario: String(scenario.val()),data:{scenario:String(scenario.val()),},};editCharDebounced(update);$('#acm_scenario_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(scenario.val())))}`);},
        '#acm_depth_prompt_prompt': function () {const depthPrompt=$('#acm_depth_prompt_prompt');const update={avatar:selectedChar,data:{ extensions:{depth_prompt:{prompt:String(depthPrompt.val()),}}},};editCharDebounced(update);$('#acm_char_notes_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(depthPrompt.val())))}`);},
        '#acm_depth_prompt_depth': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{depth:$('#acm_depth_prompt_depth').val(),}}},};editCharDebounced(update);},
        '#acm_depth_prompt_role': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{role:String($('#acm_depth_prompt_role').val()),}}},};editCharDebounced(update);},
        '#acm_talkativeness_slider': function () {const talkativeness=$('#acm_talkativeness_slider');const update={avatar:selectedChar,talkativeness:String(talkativeness.val()),data:{extensions:{talkativeness:String(talkativeness.val()),}}};editCharDebounced(update);},
        '#acm_mes_example_textarea': function () {const example=$('#acm_mes_example_textarea');const update={avatar:selectedChar,mes_example:String(example.val()),data:{mes_example:String(example.val()),},};editCharDebounced(update);$('#acm_messages_examples').text(`Tokens: ${getTokenCount(substituteParams(String(example.val())))}`);},
        '#acm_tags_textarea': function () {const tagZone=$('#acm_tags_textarea');const update={avatar:selectedChar,tags:tagZone.val().split(', '),data:{tags:tagZone.val().split(', '), },};editCharDebounced(update);}
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

    // Edit a character avatar
    $('#edit_avatar_button').on('change', function () {
        checkApiAvailability().then(async isAvailable => {
            if (isAvailable) {
                await update_avatar(this);
            } else {
                toastr.warning('Please check if the needed plugin is installed! Link in the README.');
            }
        });
    });

    $(document).on('change', '#preset_selector', function () {
        const newPreset = $(this).find(':selected').data('preset');
        $('#preset_name').html(extensionSettings.acm.dropdownPresets[newPreset].name);
        printCategoriesList(newPreset);
    });

    // Trigger on a click on the rename preset button
    $(document).on("click", ".preset_rename", async function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const newPresetName = await callPopup('<h3>New preset name:</h3>', POPUP_TYPE.INPUT, extensionSettings.acm.dropdownPresets[selectedPreset].name);
        if (newPresetName && newPresetName.trim() !== '') {
            renamePreset(selectedPreset, newPresetName);
        }
    });

    // Add new custom category to active preset
    $(document).on("click", ".cat_view_create", async function () {
        const newCatName = await callPopup('<h3>Category name:</h3>', POPUP_TYPE.INPUT, '');
        if (newCatName && newCatName.trim() !== '') {
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            addCategory(selectedPreset, newCatName);
        }
    });

    // Trigger on a click on the delete category button
    $(document).on("click", ".cat_delete", function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        removeCategory(selectedPreset, selectedCat);
    });

    // Trigger on a click on the rename category button
    $(document).on("click", ".cat_rename", async function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        const newCatName = await callPopup('<h3>New category name:</h3>', POPUP_TYPE.INPUT, extensionSettings.acm.dropdownPresets[selectedPreset].categories[selectedCat].name);
        if (newCatName && newCatName.trim() !== '') {
            renameCategory(selectedPreset, selectedCat, newCatName);
        }
    });

    // Trigger on a click on the add tag button in a category
    $(document).on("click", ".addCatTag", function () {
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        $(this)
            .removeClass('addCatTag')
            .addClass('cancelCatTag')
            .removeClass('fa-plus')
            .addClass('fa-minus');
        $(`#input_cat_tag_${selectedCat}`).show();
    });

    // Trigger on a click on the minus tag button in a category
    $(document).on("click", ".cancelCatTag", function () {
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        $(this)
            .addClass('addCatTag')
            .removeClass('cancelCatTag')
            .addClass('fa-plus')
            .removeClass('fa-minus');
        $(`#input_cat_tag_${selectedCat}`).hide();
    });

    $(document).on("click", ".tag_cat_remove", function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        const selectedTag = $(this).closest('[data-tagid]').data('tagid');
        removeTagFromCategory(selectedPreset, selectedCat, selectedTag);
        $(this).closest('[data-tagid]').remove();
    });
});
