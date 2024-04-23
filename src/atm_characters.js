import { getOneCharacter, getRequestHeaders } from '../../../../../script.js';

export { editChar };

const event_types = SillyTavern.getContext().eventTypes;
const eventSource = SillyTavern.getContext().eventSource;

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
        await getOneCharacter(update.avatar);
        await eventSource.emit(event_types.CHARACTER_EDITED, { detail: { id: this_chid, character: characters[this_chid] } });
    } else {
        console.log('Error!');
    }
}

