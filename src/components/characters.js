import {
    getCharacters, getPastCharacterChats, reloadCurrentChat, setCharacterId, system_message_types,
} from '../../../../../../script.js';
import { ensureImageFormatSupported } from '../../../../../utils.js';
import { renameGroupMember } from '../../../../../group-chats.js';
import { renameTagKey } from './tags.js';
import { debounce, delay } from '../utils.js';
import {
    event_types,
    eventSource,
    getRequestHeaders,
    characters,
    callPopup,
    POPUP_TYPE,
    selectCharacterById,
    characterId,
    getThumbnailUrl
} from "../constants/context.js";

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

                    if (getContext().characterId === -1) {
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
