import {
    depth_prompt_depth_default,
    depth_prompt_role_default,
    talkativeness_default
} from '../../../../../../script.js';
import { createTagInput } from '../../../../../tags.js';
import { displayTag } from './tags.js';
import { getBase64Async, getIdByAvatar } from '../utils.js';
import {
    characters,
    getThumbnailUrl,
    tagMap,
    unshallowCharacter,
    getTokenCountAsync,
    substituteParams, power_user, Popup, POPUP_TYPE,
} from "../constants/context.js";
import { selectedChar } from "../constants/settings.js";
import { replaceAvatar, saveAltGreetings } from "../services/characters-service.js";
import { addAltGreetingsTrigger } from "../events/characters-events.js";
// Initializing some variables


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
    $('#altGreetings_content').html(displayAltGreetings(char.data.alternate_greetings));
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
