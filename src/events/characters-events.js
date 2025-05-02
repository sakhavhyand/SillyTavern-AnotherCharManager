import {
    callPopup,
    characters,
    event_types,
    eventSource,
    getTokenCountAsync,
    POPUP_TYPE,
    selectCharacterById,
    substituteParams
} from "../constants/context.js";
import { addAltGreeting, delAltGreeting, update_avatar } from "../components/characters.js";
import { generateTagFilter } from "../components/tags.js";
import { getIdByAvatar } from "../utils.js";
import { selectedChar, setMem_avatar } from "../constants/settings.js";
import { closeDetails } from "../components/modal.js";
import { addListenersTagFilter } from "./tags-events.js";
import {
    checkApiAvailability,
    dupeChar,
    editCharDebounced,
    exportChar,
    renameChar,
    saveAltGreetings
} from "../services/characters-service.js";
import { setCharacterId } from '../../../../../../script.js';
import { refreshCharListDebounced } from "../components/charactersList.js";

export function initializeCharactersEvents() {
    // Add listener to refresh the display on characters edit
    eventSource.on('character_edited', function () {
        refreshCharListDebounced();
    });
    // Add listener to refresh the display on characters delete
    eventSource.on('characterDeleted', function () {
        let charDetailsState = document.getElementById('char-details');
        if (charDetailsState.style.display === 'none') {
            refreshCharListDebounced();
        } else {
            closeDetails();
            refreshCharListDebounced();
        }
    });
    // Add listener to refresh the display on characters duplication
    eventSource.on(event_types.CHARACTER_DUPLICATED, function () {
        refreshCharListDebounced();
    });
    // Load the characters list in background when ST launch
    eventSource.on('character_page_loaded', function () {
        generateTagFilter();
        addListenersTagFilter();
        refreshCharListDebounced();
    });

    // Adding textarea trigger on input
    const elementsToUpdate = {
        '#desc_zone': async function () {const descZone=$('#desc_zone');const update={avatar:selectedChar,description:String(descZone.val()),data:{description:String(descZone.val()),},};editCharDebounced(update);$('#desc_Tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(descZone.val())))}`);},
        '#firstMes_zone': async function () {const firstMesZone=$('#firstMes_zone');const update={avatar:selectedChar,first_mes:String(firstMesZone.val()),data:{first_mes:String(firstMesZone.val()),},};editCharDebounced(update);$('#firstMess_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(firstMesZone.val())))}`);},
        '#acm_creator_notes_textarea': function () {const creatorNotes=$('#acm_creator_notes_textarea');const update={avatar:selectedChar,creatorcomment:String(creatorNotes.val()),data:{creator_notes:String(creatorNotes.val()),},};editCharDebounced(update);},
        '#acm_character_version_textarea': function () { const update = {avatar:selectedChar,data:{character_version:String($('#acm_character_version_textarea').val()),},};editCharDebounced(update);},
        '#acm_system_prompt_textarea': async function () {const sysPrompt=$('#acm_system_prompt_textarea');const update={avatar:selectedChar,data:{system_prompt:String(sysPrompt.val()),},};editCharDebounced(update);$('#acm_main_prompt_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(String(sysPrompt.val())))}`);},
        '#acm_post_history_instructions_textarea': async function () {const postHistory=$('#acm_post_history_instructions_textarea');const update={avatar:selectedChar,data:{post_history_instructions:String(postHistory.val()),},};editCharDebounced(update);$('#acm_post_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(String(postHistory.val())))}`);},
        '#acm_creator_textarea': function () {const update={ avatar:selectedChar,data:{creator:String($('#acm_creator_textarea').val()),},};editCharDebounced(update);},
        '#acm_personality_textarea': async function () {const personality=$('#acm_personality_textarea');const update={avatar:selectedChar,personality:String(personality.val()),data:{personality:String(personality.val()),},};editCharDebounced(update);$('#acm_personality_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(String(personality.val())))}`);},
        '#acm_scenario_pole': async function () {const scenario=$('#acm_scenario_pole');const update={avatar:selectedChar,scenario: String(scenario.val()),data:{scenario:String(scenario.val()),},};editCharDebounced(update);$('#acm_scenario_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(String(scenario.val())))}`);},
        '#acm_depth_prompt_prompt': async function () {const depthPrompt=$('#acm_depth_prompt_prompt');const update={avatar:selectedChar,data:{ extensions:{depth_prompt:{prompt:String(depthPrompt.val()),}}},};editCharDebounced(update);$('#acm_char_notes_tokens').text(`Tokens: ${await getTokenCountAsync(substituteParams(String(depthPrompt.val())))}`);},
        '#acm_depth_prompt_depth': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{depth:$('#acm_depth_prompt_depth').val(),}}},};editCharDebounced(update);},
        '#acm_depth_prompt_role': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{role:String($('#acm_depth_prompt_role').val()),}}},};editCharDebounced(update);},
        '#acm_talkativeness_slider': function () {const talkativeness=$('#acm_talkativeness_slider');const update={avatar:selectedChar,talkativeness:String(talkativeness.val()),data:{extensions:{talkativeness:String(talkativeness.val()),}}};editCharDebounced(update);},
        '#acm_mes_example_textarea': async function () {const example=$('#acm_mes_example_textarea');const update={avatar:selectedChar,mes_example:String(example.val()),data:{mes_example:String(example.val()),},};editCharDebounced(update);$('#acm_messages_examples').text(`Tokens: ${await getTokenCountAsync(substituteParams(String(example.val())))}`);},
        '#acm_tags_textarea': function () {const tagZone=$('#acm_tags_textarea');const update={avatar:selectedChar,tags:tagZone.val().split(', '),data:{tags:tagZone.val().split(', '), },};editCharDebounced(update);}
    };

    Object.keys(elementsToUpdate).forEach(function (id) {
        $(id).on('input', function () {
            elementsToUpdate[id]();
        });
    });

    // Trigger when the favorites button is clicked
    $('#acm_favorite_button').on('click', function () {
        const id = getIdByAvatar(selectedChar);
        if (characters[id].fav || characters[id].data.extensions.fav) {
            const update = { avatar: selectedChar, fav: false, data: { extensions: { fav: false } } };
            editCharDebounced(update);
            $('#acm_favorite_button')[0].classList.replace('fav_on', 'fav_off');
        } else {
            const update = { avatar: selectedChar, fav: true, data: { extensions: { fav: true } } };
            editCharDebounced(update);
            $('#acm_favorite_button')[0].classList.replace('fav_off', 'fav_on');
        }
    });
    // Export character
    $('#acm_export_button').on("click", function () {
        $('#acm_export_format_popup').toggle();
        window.acmPoppers.Export.update();
    });

    $(document).on('click', '.acm_export_format', function () {
        const format = $(this).data('format');
        if (!format) {
            return;
        }
        exportChar(format, selectedChar);
    });

    // Duplicate character
    $('#acm_dupe_button').on("click", async function () {
        if (!selectedChar) {
            toastr.warning('You must first select a character to duplicate!');
            return;
        }

        const confirmMessage = `
            <h3>Are you sure you want to duplicate this character?</h3>
            <span>If you just want to start a new chat with the same character, use "Start new chat" option in the bottom-left options menu.</span><br><br>`;

        const confirm = await callPopup(confirmMessage, POPUP_TYPE.CONFIRM);

        if (!confirm) {
            console.log('User cancelled duplication');
            return;
        }
        await dupeChar(selectedChar);
    });

    // Delete character
    $('#acm_delete_button').on("click", function () {
        $('#delete_button').trigger("click");
    });

    // Edit a character avatar
    $('#edit_avatar_button').on('change', function () {
        checkApiAvailability().then(async isAvailable => {
            if (isAvailable) {
                await update_avatar(this);
            } else {
                toastr.warning('Please check if the needed plugin is installed! Link in the README.');
            }
        });
    });

    // Rename character
    $('#acm_rename_button').on("click", async function () {
        const charID = getIdByAvatar(selectedChar);
        const newName = await callPopup('<h3>New name:</h3>', POPUP_TYPE.INPUT, characters[charID].name);
        await renameChar(selectedChar, charID, newName);
    });

    // Trigger when the Open Chat button is clicked
    $('#acm_open_chat').on('click', function () {
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
    });

    // Display Advanced Definitions popup
    $('#acm_advanced_div').on("click", function () {
        const $popup = $('#acm_character_popup');
        if ($popup.css('display') === 'none') {
            $popup.css({ 'display': 'flex', 'opacity': 0.0 }).addClass('open').transition({
                opacity: 1.0,
                duration: 125,
                easing: 'ease-in-out',
            });
        } else {
            $popup.css('display', 'none').removeClass('open');
        }
    });

    $('#acm_character_cross').on("click", function () {
        $('#character_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () { $('#acm_character_popup').css('display', 'none'); }, 125);
    });

    // Add a new alternative greetings
    $(document).on('click', '.fa-circle-plus', async function (event) {
        event.stopPropagation();
        addAltGreeting();
    });

    // Delete an alternative greetings
    $(document).on('click', '.fa-circle-minus', function (event) {
        event.stopPropagation();
        const inlineDrawer = this.closest('.inline-drawer');
        const greetingIndex = parseInt(this.closest('.altgreetings-drawer-toggle').querySelector('.greeting_index').textContent);
        delAltGreeting(greetingIndex, inlineDrawer);
    });
}

/**
 * Attaches an event listener to all elements with the class 'altGreeting_zone'.
 * The event listener triggers the saveAltGreetings function whenever an 'input' event occurs on the element.
 *
 * @return {void} This function does not return anything.
 */
export function addAltGreetingsTrigger(){
    document.querySelectorAll('.altGreeting_zone').forEach(textarea => {
        textarea.addEventListener('input', (event) => {saveAltGreetings(event);});
    });
}
