import { getContext } from '../../../../extensions.js';
import {
    getCharacters, getPastCharacterChats, reloadCurrentChat, setCharacterId, system_message_types,
} from '../../../../../script.js';
import { renameTagKey } from '../../../../tags.js';
import { delay, ensureImageFormatSupported } from '../../../../utils.js';
import { renameGroupMember } from '../../../../group-chats.js';

export { editChar, replaceAvatar, dupeChar, renameChar, exportChar, checkApiAvailability };

const event_types = getContext().eventTypes;
const eventSource = getContext().eventSource;
const getRequestHeaders = getContext().getRequestHeaders;
const characters = getContext().characters;
const callPopup = getContext().callGenericPopup;
const POPUP_TYPE = getContext().POPUP_TYPE;
const selectCharacterById = getContext().selectCharacterById;
const this_chid = getContext().characterId;
const getThumbnailUrl = getContext().getThumbnailUrl;


// Function to check if the avatar plugin is installed
async function checkApiAvailability() {
    try {
        const response = await fetch('/api/plugins/avataredit/probe', {method: 'POST', headers: getRequestHeaders()});
        return response.status === 204;
    } catch (err) {
        console.error('Error checking API availability:', err);
        return false;
    }
}

// Function to edit a single character
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
        await eventSource.emit(event_types.CHARACTER_EDITED, { detail: { id: this_chid, character: characters[this_chid] } });
    } else {
        console.log('Error!');
    }
}

// Function to replace an avatar
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

// Function to duplicate a character
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

// Function to rename a character
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

// Function to rename existing chats of a character ( associated with the renameChar function )
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

// Function to export a character
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
