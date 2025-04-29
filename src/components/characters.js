import {
    setCharacterId,
    setMenuType,
    depth_prompt_depth_default,
    depth_prompt_role_default,
    talkativeness_default
} from '../../../../../../script.js';
import { createTagInput } from '../../../../../tags.js';
import { displayTag } from './tags.js';
import { debounce, getBase64Async, getIdByAvatar } from '../utils.js';
import {
    characters,
    getThumbnailUrl,
    tagMap,
    unshallowCharacter,
    getTokenCountAsync,
    substituteParams, power_user, Popup, POPUP_TYPE,
} from "../constants/context.js";
import { selectedChar, setSelectedChar } from "../constants/settings.js";
import { addAltGreetingsTrigger, displayAltGreetings } from "./altGreetings.js";
import { searchAndFilter, sortCharAR } from "../services/searchAndFilter-service.js";
import { getSetting } from "../services/settings-service.js";
import { dropdownAllTags, dropdownCreators, dropdownCustom } from "./dropdownUI.js";
import { replaceAvatar } from "../services/characters-service.js";
// Initializing some variables
export const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 200);

// Function not used at this moment, leaving it here just in case
// async function delChar(avatar, delChats = true) {
//
//     const toDel = {
//         avatar_url: avatar,
//         delete_chats: delChats,
//     };
//
//     const response = await fetch('/api/characters/delete', {
//         method: 'POST',
//         headers: getRequestHeaders(),
//         body: JSON.stringify(toDel),
//         cache: 'no-cache',
//     });
//
//     if (response.ok) {
//         // TO DO ?
//     } else {
//         console.log('Error!');
//     }
// }

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
    const text = substituteParams(
        char.name +
        char.description +
        char.first_mes +
        (char.data?.extensions?.depth_prompt?.prompt ?? '') +
        (char.data?.post_history_instructions || '') +
        char.personality +
        char.scenario +
        (char.data?.extensions?.depth_prompt?.prompt ?? '') +
        char.mes_example
    );
    const tokens = await getTokenCountAsync(text);
    $('#ch_infos_tokens').text(`Tokens: ${tokens}`);
    const permText = substituteParams(
        char.name +
        char.description +
        char.personality +
        char.scenario +
        (char.data?.extensions?.depth_prompt?.prompt ?? '')
    );
    const permTokens = await getTokenCountAsync(permText);
    $('#ch_infos_permtokens').text(`Perm. Tokens: ${permTokens}`);
    $('#desc_Tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.description))}`);
    $('#desc_zone').val(char.description);
    $('#firstMess_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.first_mes))}`);
    $('#firstMes_zone').val(char.first_mes);
    $('#altGreetings_number').text(`Numbers: ${char.data.alternate_greetings?.length ?? 0}`);
    $('#tag_List').html(`${tagMap[char.avatar].map((tag) => displayTag(tag)).join('')}`);
    createTagInput('#input_tag', '#tag_List', { tagOptions: { removable: true } });
    $('#altGreetings_content').html(displayAltGreetings(char.data.alternate_greetings));
    $('#acm_favorite_button').toggleClass('fav_on', char.fav || char.data.extensions.fav).toggleClass('fav_off', !(char.fav || char.data.extensions.fav));

    addAltGreetingsTrigger()
}

async function fillAdvancedDefinitions(avatar) {
    const char = characters[getIdByAvatar(avatar)];

    $('#acm_character_popup-button-h3').text(char.name);
    $('#acm_creator_notes_textarea').val(char.data?.creator_notes || char.creatorcomment);
    $('#acm_character_version_textarea').val(char.data?.character_version || '');
    $('#acm_system_prompt_textarea').val(char.data?.system_prompt || '');
    $('#acm_main_prompt_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.data?.system_prompt || ''))}`);
    $('#acm_post_history_instructions_textarea').val(char.data?.post_history_instructions || '');
    $('#acm_post_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.data?.post_history_instructions || ''))}`);
    $('#acm_tags_textarea').val(Array.isArray(char.data?.tags) ? char.data.tags.join(', ') : '');
    $('#acm_creator_textarea').val(char.data?.creator);
    $('#acm_personality_textarea').val(char.personality);
    $('#acm_personality_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.personality))}`);
    $('#acm_scenario_pole').val(char.scenario);
    $('#acm_scenario_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.scenario))}`);
    $('#acm_depth_prompt_prompt').val(char.data?.extensions?.depth_prompt?.prompt ?? '');
    $('#acm_char_notes_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.data?.extensions?.depth_prompt?.prompt ?? ''))}`);
    $('#acm_depth_prompt_depth').val(char.data?.extensions?.depth_prompt?.depth ?? depth_prompt_depth_default);
    $('#acm_depth_prompt_role').val(char.data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default);
    $('#acm_talkativeness_slider').val(char.talkativeness || talkativeness_default);
    $('#acm_mes_example_textarea').val(char.mes_example);
    $('#acm_messages_examples').text(`Tokens: ${await getTokenCountAsync(substituteParams(char.mes_example))}`);

}

// Function to refresh the character list based on search and sorting parameters
function refreshCharList() {
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

// Function to replace the avatar with a new one
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
