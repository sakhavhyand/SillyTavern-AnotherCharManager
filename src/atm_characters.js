import { depth_prompt_role_default, getOneCharacter } from '../../../../../script.js';

export { editChar };

const event_types = SillyTavern.getContext().eventTypes;
const eventSource = SillyTavern.getContext().eventSource;
const editUrl = '/api/characters/edit';

function buildFormData() {
    const formData = new FormData();
    const this_chid = SillyTavern.getContext().characterId;
    const characters = SillyTavern.getContext().characters;

    formData.append('ch_name', characters[this_chid].name);
    formData.append('avatar', '');
    formData.append('fav', characters[this_chid].fav);
    formData.append('description', $('#desc_zone').val());
    formData.append('first_mes', $('#firstMes_zone').val());
    formData.append('json_data', characters[this_chid].json_data);
    formData.append('avatar_url', characters[this_chid].avatar);
    formData.append('chat', characters[this_chid].chat);
    formData.append('create_date', characters[this_chid].create_date);
    formData.append('last_mes', '');
    formData.append('world', characters[this_chid].data?.extensions?.world ?? '');
    formData.append('system_prompt', characters[this_chid].data.system_prompt);
    formData.append('post_history_instructions', characters[this_chid].data.post_history_instructions);
    formData.append('creator', characters[this_chid].creator);
    formData.append('character_version', characters[this_chid].character_version);
    formData.append('creator_notes', characters[this_chid].creatorcomment !== undefined ? characters[this_chid].creatorcomment : characters[this_chid].data.creator_notes);
    formData.append('tags', '');
    formData.append('personality', characters[this_chid].personality);
    formData.append('scenario', characters[this_chid].scenario);
    formData.append('depth_prompt_prompt', characters[this_chid].data?.extensions?.depth_prompt?.prompt);
    formData.append('depth_prompt_depth', characters[this_chid].data?.extensions?.depth_prompt?.depth);
    formData.append('depth_prompt_role', characters[this_chid].data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default);
    formData.append('talkativeness', characters[this_chid].data.extensions.talkativeness);
    formData.append('mes_example', characters[this_chid].mes_example);

    if (this_chid && Array.isArray(characters[this_chid]?.data?.alternate_greetings)) {
        for (const value of characters[this_chid].data.alternate_greetings) {
            formData.append('alternate_greetings', value);
        }
    }
    return formData;
}

async function editChar() {
    const this_chid = SillyTavern.getContext().characterId;
    const characters = SillyTavern.getContext().characters;

    await jQuery.ajax({
        type: 'POST',
        url: editUrl,
        data: buildFormData(),
        cache: false,
        contentType: false,
        processData: false,
        success: async function () {
            await getOneCharacter(characters[this_chid].avatar);
            eventSource.emit(event_types.CHARACTER_EDITED, { detail: { id: this_chid, character: characters[this_chid] } });
        },
        error: function (jqXHR, exception) {
            console.log('Error! Either a file with the same name already existed, or the image file provided was in an invalid format. Double check that the image is not a webp.');
        },
    });
}
