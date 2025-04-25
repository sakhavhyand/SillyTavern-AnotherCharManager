import {
    getCharacters, getPastCharacterChats, reloadCurrentChat, setCharacterId, system_message_types, setMenuType, depth_prompt_depth_default, depth_prompt_role_default, talkativeness_default
} from '../../../../../../script.js';
import { ensureImageFormatSupported } from '../../../../../utils.js';
import { renameGroupMember } from '../../../../../group-chats.js';
import { createTagInput } from '../../../../../tags.js';
import {displayTag, renameTagKey} from './tags.js';
import {debounce, delay, getBase64Async, getIdByAvatar} from '../utils.js';
import {
    event_types,
    eventSource,
    getRequestHeaders,
    characters,
    callPopup,
    POPUP_TYPE,
    selectCharacterById,
    characterId,
    getThumbnailUrl, tagMap, unshallowCharacter, getTokenCount, substituteParams, power_user
} from "../constants/context.js";
import { selectedChar, setSelectedChar } from "../constants/settings.js";
import {addAltGreetingsTrigger, displayAltGreetings} from "./altGreetings.js";
import {searchAndFilter, sortCharAR} from "../services/searchAndFilter-service.js";
import {getSetting} from "../services/settings-service.js";
import {dropdownAllTags, dropdownCreators, dropdownCustom} from "./dropdownUI.js";

export { editCharDebounced, replaceAvatar, dupeChar, renameChar, exportChar, checkApiAvailability };

const editCharDebounced = debounce( (data) => { editChar(data); }, 1000);

/**
 * Checks the availability of the AvatarEdit API by making a POST request to the probe endpoint.
 *
 * @return {Promise<boolean>} A promise that resolves to true if the API is available (returns a status of 204), or false otherwise.
 */
async function checkApiAvailability() {
    try {
        const response = await fetch('/api/plugins/avataredit/probe', {method: 'POST', headers: getRequestHeaders()});
        return response.status === 204;
    } catch (err) {
        console.error('Error checking API availability:', err);
        return false;
    }
}

/**
 * Updates the attributes of a character by sending a POST request with the given data.
 * Emits an event upon successful update.
 *
 * @param {Object} update - The object containing the character attributes to update.
 * @return {Promise<void>} A promise that resolves when the character is successfully updated or logs an error if the request fails.
 */
async function editChar(update) {
    let url = '/api/characters/merge-attributes';

    const response = await fetch(url, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(update),
        cache: 'no-cache',
    });

    if (response.ok) {
        await getCharacters();
        await eventSource.emit(event_types.CHARACTER_EDITED, { detail: { id: characterId, character: characters[characterId] } });
    } else {
        console.log('Error!');
    }
}

/**
 * Replaces a character's avatar with a new one, with optional cropping.
 *
 * @param {File|string} newAvatar - The new avatar to replace the current one. Can be a File object or a URL string.
 * @param {string} id - The unique identifier of the character whose avatar is being replaced.
 * @param {Object} [crop_data] - Optional cropping data for the avatar, if applicable.
 * @return {Promise<void>} A promise that resolves when the avatar has been successfully replaced or rejects if an error occurs.
 */
async function replaceAvatar(newAvatar, id, crop_data = undefined) {
    let url = '/api/plugins/avataredit/edit-avatar';

    if (crop_data !== undefined) {
        url += `?crop=${encodeURIComponent(JSON.stringify(crop_data))}`;
    }

    let formData = new FormData();
    if (newAvatar instanceof File) {
        const convertedFile = await ensureImageFormatSupported(newAvatar);
        formData.set('avatar', convertedFile);
    }

    formData.set('avatar_url', characters[id].avatar);

    return new Promise((resolve, reject) => {
        jQuery.ajax({
            type: 'POST',
            url: url,
            data: formData,
            cache: false,
            contentType: false,
            processData: false,
            success: async function () {
                toastr.success('Avatar replaced successfully.');
                await fetch(getThumbnailUrl('avatar', formData.get('avatar_url')), {
                    method: 'GET',
                    cache: 'no-cache',
                    headers: {
                        'pragma': 'no-cache',
                        'cache-control': 'no-cache',
                    },
                });
                await getCharacters();
                await eventSource.emit(event_types.CHARACTER_EDITED, { detail: { id: id, character: characters[id] } });
                resolve();
            },
            error: function (jqXHR, exception) {
                toastr.error('Something went wrong while saving the character, or the image file provided was in an invalid format. Double check that the image is not a webp.');
                reject();
            }
        });
    });
}

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

/**
 * Sends a request to duplicate a character based on the provided avatar URL.
 * Upon success, notifies via a success message, emits an event containing
 * the duplication details, and refreshes the character list.
 *
 * @param {string} avatar - The URL of the avatar to be duplicated.
 * @return {Promise<void>} Resolves when the operation is complete.
 */
async function dupeChar(avatar) {
    const body = { avatar_url: avatar };
    const response = await fetch('/api/characters/duplicate', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(body),
    });

    if (response.ok) {
        toastr.success('Character Duplicated');
        const data = await response.json();
        await eventSource.emit(event_types.CHARACTER_DUPLICATED, { oldAvatar: body.avatar_url, newAvatar: data.path });
        await getCharacters();
    }
}

/**
 * Renames an existing character and updates related data across the system.
 * This includes updating the character's avatar, name, associated group membership,
 * and optionally updating past chat logs to reflect the new name.
 *
 * @param {string} oldAvatar - The current avatar URL of the character being renamed.
 * @param {number} charID - The unique identifier of the character to be renamed.
 * @param {string} newName - The new name to assign to the character.
 * @return {Promise<void>} Resolves when the character has been successfully renamed,
 *         associated data updated, and UI changes applied. Rejects if any operation fails during the process.
 */
async function renameChar(oldAvatar, charID, newName) {

    if (newName && newName !== characters[charID].name) {
        const body = JSON.stringify({ avatar_url: oldAvatar, new_name: newName });
        const response = await fetch('/api/characters/rename', {
            method: 'POST',
            headers: getRequestHeaders(),
            body,
        });

        try {
            if (response.ok) {
                const data = await response.json();
                const newAvatar = data.avatar;

                // Replace tags list
                renameTagKey(oldAvatar, newAvatar);

                // Reload characters list
                await getCharacters();

                // Find newly renamed character
                const newChId = characters.findIndex(c => c.avatar == data.avatar);

                if (newChId !== -1) {
                    // Select the character after the renaming
                    setCharacterId(-1);
                    await selectCharacterById(String(newChId));

                    // Async delay to update UI
                    await delay(1);
                    await eventSource.emit(event_types.CHARACTER_EDITED, { detail: { id: newChId, character: characters[newChId] } });

                    if (characterId === -1) {
                        throw new Error('New character not selected');
                    }

                    // Also rename as a group member
                    await renameGroupMember(oldAvatar, newAvatar, newName);
                    const renamePastChatsConfirm = await callPopup(`<h3>Character renamed!</h3>
                    <p>Past chats will still contain the old character name. Would you like to update the character name in previous chats as well?</p>
                    <i><b>Sprites folder (if any) should be renamed manually.</b></i>`, POPUP_TYPE.CONFIRM);

                    if (renamePastChatsConfirm) {
                        await renamePastChats(newAvatar, newName);
                        await reloadCurrentChat();
                        toastr.success('Character renamed and past chats updated!');
                    }
                }
                else {
                    throw new Error('Newly renamed character was lost?');
                }
            }
            else {
                throw new Error('Could not rename the character');
            }
        }
        catch {
            // Reloading to prevent data corruption
            await callPopup('Something went wrong. The page will be reloaded.', POPUP_TYPE.TEXT);
            location.reload();
        }
    }
}

/**
 * Renames past chats and updates their associated avatar and chat name in a persistent storage.
 * Iterates through all past chat files, modifies the chat data to reflect the new avatar and chat name,
 * and then saves the updated chats back to storage.
 *
 * @param {string} newAvatar - The new avatar URL to associate with the past chats.
 * @param {string} newValue - The new name to assign to the past chats.
 * @return {Promise<void>} A promise that resolves when all past chats have been processed and saved.
 */
async function renamePastChats(newAvatar, newValue) {
    const pastChats = await getPastCharacterChats();

    for (const { file_name } of pastChats) {
        try {
            const fileNameWithoutExtension = file_name.replace('.jsonl', '');
            const getChatResponse = await fetch('/api/chats/get', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    ch_name: newValue,
                    file_name: fileNameWithoutExtension,
                    avatar_url: newAvatar,
                }),
                cache: 'no-cache',
            });

            if (getChatResponse.ok) {
                const currentChat = await getChatResponse.json();
                for (const message of currentChat) {
                    if (message.is_user || message.is_system || message.extra?.type == system_message_types.NARRATOR) {
                        continue;
                    }
                    if (message.name !== undefined) {
                        message.name = newValue;
                    }
                }

                const saveChatResponse = await fetch('/api/chats/save', {
                    method: 'POST',
                    headers: getRequestHeaders(),
                    body: JSON.stringify({
                        ch_name: newValue,
                        file_name: fileNameWithoutExtension,
                        chat: currentChat,
                        avatar_url: newAvatar,
                    }),
                    cache: 'no-cache',
                });

                if (!saveChatResponse.ok) {
                    throw new Error('Could not save chat');
                }
            }
        } catch (error) {
            toastr.error(`Past chat could not be updated: ${file_name}`);
            console.error(error);
        }
    }
}

/**
 * Exports a character's avatar in the specified format.
 *
 * @param {string} format - The desired file format for the exported avatar (e.g., "png", "jpg").
 * @param {string} avatar - The URL of the avatar image to be exported.
 * @return {Promise<void>} A promise that resolves when the export operation completes.
 */
async function exportChar (format, avatar) {
    const body = { format, avatar_url: avatar };

    const response = await fetch('/api/characters/export', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(body),
    });

    if (response.ok) {
        const filename = avatar.replace('.png', `.${format}`);
        const blob = await response.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    $('#acm_export_format_popup').hide();
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


// Initializing some variables
export const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 200);

// Function to fill details in the character details block
export async function fillDetails(avatar) {
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

export function fillAdvancedDefinitions(avatar) {
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

// Function to replace the avatar by a new one
export async function update_avatar(input){
    if (input.files && input.files[0]) {

        let crop_data = undefined;
        const file = input.files[0];
        const fileData = await getBase64Async(file);

        if (!spower_user.never_resize_avatars) {
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
