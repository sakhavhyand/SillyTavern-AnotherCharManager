// An extension that allows you to manage characters.
import { setCharacterId, setMenuType, depth_prompt_depth_default, depth_prompt_role_default, talkativeness_default, } from '../../../../script.js';
import { createTagInput } from '../../../tags.js';
import { replaceAvatar } from './src/components/characters.js';
import {
    dropdownAllTags, dropdownCustom, dropdownCreators
} from './src/components/dropdownUI.js';
import {
    displayTag,
    initializeTagFilterStates
} from './src/components/tags.js';
import { addAltGreetingsTrigger, displayAltGreetings } from './src/components/altGreetings.js';
import {debounce, getBase64Async, getIdByAvatar} from './src/utils.js';
import {
    getSetting,
    initializeSettings,
} from "./src/services/settings-service.js";
import { initializeModal } from "./src/components/modal.js";
import {
    mem_avatar,
    searchValue,
    selectedChar, setMem_avatar, setMem_menu,
    setSelectedChar,
    tagFilterstates
} from "./src/constants/settings.js";
import { initializeEventHandlers } from "./src/events/global-events.js";
import {
    power_user,
    getTokenCount,
    getThumbnailUrl,
    characters,
    unshallowCharacter,
    tagMap,
    tagList,
    Popup,
    POPUP_TYPE,
    substituteParams,
    menuType, characterId
} from "./src/constants/context.js";

// Initializing some variables
export const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 200);

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
    const charactersCopy = getSetting('favOnly')
        ? [...characters].filter(character => character.fav === true || character.data.extensions.fav === true)
        : [...characters];

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
        const sortingField = getSetting('sortingField');
        const sortingOrder = getSetting('sortingOrder');
        const dropdownUI = getSetting('dropdownUI');
        const dropdownMode = getSetting('dropdownMode');
        const sortedList = sortCharAR(filteredChars, sortingField, sortingOrder);

        if(dropdownUI && dropdownMode === "allTags"){
            $('#character-list').html(dropdownAllTags(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else if(dropdownUI && dropdownMode === "custom"){
            $('#character-list').html(dropdownCustom(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else if(dropdownUI && dropdownMode === "creators"){
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
    $('#charNumber').empty().append(`Total characters : ${characters.length}`);
}

// Function to display the selected character
export function selectAndDisplay(avatar) {

    // Check if a visible character is already selected
    if(typeof selectedChar !== 'undefined' && document.querySelector(`[data-avatar="${selectedChar}"]`) !== null){
        document.querySelector(`[data-avatar="${selectedChar}"]`).classList.replace('char_selected','char_select');
    }
    setMenuType('character_edit');
    setSelectedChar(avatar);
    setCharacterId(getIdByAvatar(avatar));

    $('#acm_export_format_popup').hide();

    fillDetails(avatar);
    fillAdvancedDefinitions(avatar);

    document.querySelector(`[data-avatar="${avatar}"]`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.display = 'block';
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to replace the avatar by a new one
export async function update_avatar(input){
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
export function closeDetails( reset = true ) {
    if(reset){ setCharacterId(getIdByAvatar(mem_avatar)); }

    $('#acm_export_format_popup').hide();
    document.querySelector(`[data-avatar="${selectedChar}"]`)?.classList.replace('char_selected','char_select');
    document.getElementById('char-details').style.display = 'none';
    document.getElementById('char-sep').style.display = 'none';
    setSelectedChar(undefined);
}

// Function to build the modal
export function openModal() {

    // Memorize some global variables
    if (characterId !== undefined && characterId >= 0) {
        setMem_avatar(characters[characterId].avatar);
    } else {
        setMem_avatar(undefined);
    }
    setMem_menu(menuType);

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

        option.selected = field === getSetting('sortingField') && order === getSetting('sortingOrder');
    });
    document.getElementById('favOnly_checkbox').checked = getSetting('favOnly');
}

jQuery(async () => {

    await initializeSettings();
    await initializeTagFilterStates();
    await initializeModal();
    initializeEventHandlers();

});
