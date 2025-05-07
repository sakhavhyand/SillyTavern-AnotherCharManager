import {
    depth_prompt_depth_default,
    depth_prompt_role_default,
    talkativeness_default
} from '../../../../../../script.js';
import { createTagInput } from '../../../../../tags.js';
import { displayTag } from './tags.js';
import { getBase64Async, getIdByAvatar, updateTokenCounter } from '../utils.js';
import {
    characters,
    getThumbnailUrl,
    tagMap,
    unshallowCharacter,
    getTokenCountAsync,
    substituteParams, power_user, Popup, POPUP_TYPE, callPopup, selectCharacterById,
} from "../constants/context.js";
import { selectedChar, setMem_avatar } from "../constants/settings.js";
import {
    dupeChar,
    editCharDebounced,
    exportChar, renameChar,
    replaceAvatar,
    saveAltGreetings
} from "../services/characters-service.js";
import { addAltGreetingsTrigger } from "../events/characters-events.js";
import { closeDetails } from "./modal.js";
import { setCharacterId } from '../../../../../../script.js';


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

export function initializeFieldUpdaters() {
    const elementsToUpdate = {
        '#desc_zone': async function () {const descZone=$('#desc_zone');const update={avatar:selectedChar,description:String(descZone.val()),data:{description:String(descZone.val()),},};editCharDebounced(update);await updateTokenCounter('desc_Tokens', String(descZone.val()));},
        '#firstMes_zone': async function () {const firstMesZone=$('#firstMes_zone');const update={avatar:selectedChar,first_mes:String(firstMesZone.val()),data:{first_mes:String(firstMesZone.val()),},};editCharDebounced(update);await updateTokenCounter('firstMess_tokens', String(firstMesZone.val()));},
        '#acm_creator_notes_textarea': function () {const creatorNotes=$('#acm_creator_notes_textarea');const update={avatar:selectedChar,creatorcomment:String(creatorNotes.val()),data:{creator_notes:String(creatorNotes.val()),},};editCharDebounced(update);},
        '#acm_character_version_textarea': function () { const update = {avatar:selectedChar,data:{character_version:String($('#acm_character_version_textarea').val()),},};editCharDebounced(update);},
        '#acm_system_prompt_textarea': async function () {const sysPrompt=$('#acm_system_prompt_textarea');const update={avatar:selectedChar,data:{system_prompt:String(sysPrompt.val()),},};editCharDebounced(update);await updateTokenCounter('acm_main_prompt_tokens', String(sysPrompt.val()));},
        '#acm_post_history_instructions_textarea': async function () {const postHistory=$('#acm_post_history_instructions_textarea');const update={avatar:selectedChar,data:{post_history_instructions:String(postHistory.val()),},};editCharDebounced(update);await updateTokenCounter('acm_post_tokens', String(postHistory.val()));},
        '#acm_creator_textarea': function () {const update={ avatar:selectedChar,data:{creator:String($('#acm_creator_textarea').val()),},};editCharDebounced(update);},
        '#acm_personality_textarea': async function () {const personality=$('#acm_personality_textarea');const update={avatar:selectedChar,personality:String(personality.val()),data:{personality:String(personality.val()),},};editCharDebounced(update);await updateTokenCounter('acm_personality_tokens', String(personality.val()));},
        '#acm_scenario_pole': async function () {const scenario=$('#acm_scenario_pole');const update={avatar:selectedChar,scenario: String(scenario.val()),data:{scenario:String(scenario.val()),},};editCharDebounced(update);await updateTokenCounter('acm_scenario_tokens', String(scenario.val()));},
        '#acm_depth_prompt_prompt': async function () {const depthPrompt=$('#acm_depth_prompt_prompt');const update={avatar:selectedChar,data:{ extensions:{depth_prompt:{prompt:String(depthPrompt.val()),}}},};editCharDebounced(update);await updateTokenCounter('acm_char_notes_tokens', String(depthPrompt.val()));},
        '#acm_depth_prompt_depth': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{depth:$('#acm_depth_prompt_depth').val(),}}},};editCharDebounced(update);},
        '#acm_depth_prompt_role': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{role:String($('#acm_depth_prompt_role').val()),}}},};editCharDebounced(update);},
        '#acm_talkativeness_slider': function () {const talkativeness=$('#acm_talkativeness_slider');const update={avatar:selectedChar,talkativeness:String(talkativeness.val()),data:{extensions:{talkativeness:String(talkativeness.val()),}}};editCharDebounced(update);},
        '#acm_mes_example_textarea': async function () {const example=$('#acm_mes_example_textarea');const update={avatar:selectedChar,mes_example:String(example.val()),data:{mes_example:String(example.val()),},};editCharDebounced(update);await updateTokenCounter('acm_messages_examples', String(example.val()));},
        '#acm_tags_textarea': function () {const tagZone=$('#acm_tags_textarea');const update={avatar:selectedChar,tags:tagZone.val().split(', '),data:{tags:tagZone.val().split(', '), },};editCharDebounced(update);}
    };

    Object.keys(elementsToUpdate).forEach(function (id) {
        $(id).on('input', elementsToUpdate[id]);
    });
}

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
    displayAltGreetings(char.data.alternate_greetings).then(html => {
        $('#altGreetings_content').html(html);
    });
    $('#acm_favorite_button').toggleClass('fav_on', char.fav || char.data.extensions.fav).toggleClass('fav_off', !(char.fav || char.data.extensions.fav));

    addAltGreetingsTrigger()
}

export async function fillAdvancedDefinitions(avatar) {
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

export function toggleFavoriteStatus() {
    const id = getIdByAvatar(selectedChar);
    const isFavorite = characters[id].fav || characters[id].data.extensions.fav;

    const update = {
        avatar: selectedChar,
        fav: !isFavorite,
        data: {
            extensions: {
                fav: !isFavorite
            }
        }
    };

    editCharDebounced(update);

    const favoriteButton = $('#acm_favorite_button')[0];
    if (isFavorite) {
        favoriteButton.classList.replace('fav_on', 'fav_off');
    } else {
        favoriteButton.classList.replace('fav_off', 'fav_on');
    }
}

export function exportCharacter(format) {
    exportChar(format, selectedChar);
}

export async function duplicateCharacter() {
    if (!selectedChar) {
        toastr.warning('You must first select a character to duplicate!');
        return;
    }

    const confirmed = await showDuplicateConfirmation();
    if (!confirmed) {
        console.log('User cancelled duplication');
        return;
    }

    await dupeChar(selectedChar);
}

export async function showDuplicateConfirmation() {
    const confirmMessage = `
        <h3>Are you sure you want to duplicate this character?</h3>
        <span>If you just want to start a new chat with the same character, use "Start new chat" option in the bottom-left options menu.</span><br><br>`;

    return await callPopup(confirmMessage, POPUP_TYPE.CONFIRM);
}

export async function showRenameDialog(characterAvatar) {
    const charID = getIdByAvatar(characterAvatar);
    return await callPopup('<h3>New name:</h3>', POPUP_TYPE.INPUT, characters[charID].name);
}

export async function renameCharacter() {
    const charID = getIdByAvatar(selectedChar);
    const newName = await showRenameDialog(selectedChar);
    await renameChar(selectedChar, charID, newName);
}

export function openCharacterChat() {
    setCharacterId(undefined);
    setMem_avatar(undefined);
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
}

export function toggleAdvancedDefinitionsPopup() {
    const $popup = $('#acm_character_popup');

    if ($popup.css('display') === 'none') {
        $popup.css({ 'display': 'flex', 'opacity': 0.0 })
            .addClass('open')
            .transition({
                opacity: 1.0,
                duration: 125,
                easing: 'ease-in-out',
            });
    } else {
        $popup.css('display', 'none').removeClass('open');
    }
}

export function closeCharacterPopup() {
    $('#character_popup').transition({
        opacity: 0,
        duration: 125,
        easing: 'ease-in-out',
    });
    setTimeout(function () {
        $('#acm_character_popup').css('display', 'none');
    }, 125);
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

/**
 * Adds a new alternate greeting section to the DOM within the 'altGreetings_content' container.
 * Each new section is dynamically created and appended to the container, including appropriate event listeners.
 *
 * @return {void} Does not return anything.
 */
export function addAltGreeting(){
    const drawerContainer = document.getElementById('altGreetings_content');

    // Determine the new greeting index
    const greetingIndex = drawerContainer.getElementsByClassName('inline-drawer').length + 1;

    // Create the new inline-drawer block
    const altGreetingDiv = document.createElement('div');
    altGreetingDiv.className = 'inline-drawer';
    altGreetingDiv.innerHTML = `<div id="altGreetDrawer${greetingIndex}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <div style="display: flex;flex-grow: 1;">
                        <strong class="drawer-header-item">
                            Greeting #
                            <span class="greeting_index">${greetingIndex}</span>
                        </strong>
                        <span class="tokens_count drawer-header-item">Tokens: 0</span>
                    </div>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight"></textarea>
                </div>
            </div>`;

    // Add the new inline-drawer block
    $('#chicken').empty();
    drawerContainer.appendChild(altGreetingDiv);

    // Add the event on the textarea
    altGreetingDiv.querySelector(`.altGreeting_zone`).addEventListener('input', (event) => {
        saveAltGreetings(event);
    });

    // Save it
    saveAltGreetings();
}

/**
 * Deletes an alternative greeting block, updates the indices of remaining blocks,
 * and ensures a proper UI display for the alternative greetings section.
 *
 * @param {number} index The index of the alternative greeting block to be deleted.
 * @param {Object} inlineDrawer The DOM element representing the alternative greeting block to remove.
 * @return {void} The function does not return a value.
 */
export function delAltGreeting(index, inlineDrawer){
    // Delete the AltGreeting block
    inlineDrawer.remove();

    // Update the others AltGreeting blocks
    const $altGreetingsToggle = $('.altgreetings-drawer-toggle');

    if ($('div[id^="altGreetDrawer"]').length === 0) {
        $('#altGreetings_content').html('<span id="chicken">Nothing here but chickens!!</span>');
    }
    else {
        $altGreetingsToggle.each(function() {
            const currentIndex = parseInt($(this).find('.greeting_index').text());
            if (currentIndex > index) {
                $(this).find('.greeting_index').text(currentIndex - 1);
                $(this).attr('id', `altGreetDrawer${currentIndex - 1}`);
            }
        });
    }

    // Save it
    saveAltGreetings();
}

/**
 * Generates and returns HTML content for alternative greetings based on the provided items.
 *
 * @param {string[]} item - An array of strings where each string represents a greeting.
 * @return {string} The generated HTML as a string. If the `item` array is empty, a placeholder HTML string is returned.
 */
async function displayAltGreetings(item) {
    let altGreetingsHTML = '';

    if (!item || item.length === 0) {
        return '<span id="chicken">Nothing here but chickens!!</span>';
    } else {
        for (let i = 0; i < item.length; i++) {
            let greetingNumber = i + 1;
            altGreetingsHTML += `<div class="inline-drawer">
                <div id="altGreetDrawer${greetingNumber}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <div style="display: flex;flex-grow: 1;">
                        <strong class="drawer-header-item">
                            Greeting #
                            <span class="greeting_index">${greetingNumber}</span>
                        </strong>
                        <span class="tokens_count drawer-header-item">Tokens: ${await getTokenCountAsync(substituteParams(item[i]))}</span>
                    </div>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight">${item[i]}</textarea>
                </div>
            </div>`;
        }
        return altGreetingsHTML;
    }
}
