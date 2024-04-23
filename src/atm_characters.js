import {
    getCharacters, getPastCharacterChats, reloadCurrentChat, setCharacterId, system_message_types,
} from '../../../../../script.js';
import { renameTagKey } from '../../../../tags.js';
import { delay } from '../../../../utils.js';
import { renameGroupMember } from '../../../../group-chats.js';

export { editChar, delChar, dupeChar, renameChar };

const event_types = SillyTavern.getContext().eventTypes;
const eventSource = SillyTavern.getContext().eventSource;
const getRequestHeaders = SillyTavern.getContext().getRequestHeaders;
const characters = SillyTavern.getContext().characters;
const callPopup = SillyTavern.getContext().callPopup;
const selectCharacterById = SillyTavern.getContext().selectCharacterById;

async function editChar(update) {
    const this_chid = SillyTavern.getContext().characterId;
    const characters = SillyTavern.getContext().characters;

    const response = await fetch('/api/characters/merge-attributes', {
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

// Function not used at this moment, leaving it here just in case
async function delChar(avatar, delChats = true) {

    const toDel = {
        avatar_url: avatar,
        delete_chats: delChats,
    };

    const response = await fetch('/api/characters/delete', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(toDel),
        cache: 'no-cache',
    });

    if (response.ok) {
        // TO DO ?
    } else {
        console.log('Error!');
    }
}

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

                    if (SillyTavern.getContext().characterId === -1) {
                        throw new Error('New character not selected');
                    }

                    // Also rename as a group member
                    await renameGroupMember(oldAvatar, newAvatar, newName);
                    const renamePastChatsConfirm = await callPopup(`<h3>Character renamed!</h3>
                    <p>Past chats will still contain the old character name. Would you like to update the character name in previous chats as well?</p>
                    <i><b>Sprites folder (if any) should be renamed manually.</b></i>`, 'confirm');

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
            await callPopup('Something went wrong. The page will be reloaded.', 'text');
            location.reload();
        }
    }
}

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
