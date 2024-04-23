import {
    getCharacters,
} from '../../../../../script.js';

export { editChar, delChar, dupeChar };

const event_types = SillyTavern.getContext().eventTypes;
const eventSource = SillyTavern.getContext().eventSource;
const getRequestHeaders = SillyTavern.getContext().getRequestHeaders;

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
