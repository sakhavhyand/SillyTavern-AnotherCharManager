import { selectedChar, setMem_avatar } from "../constants/settings.js";
import { getTokenCountAsync, selectCharacterById, substituteParams } from "../constants/context.js";
import { getIdByAvatar } from "../utils.js";
import { addAltGreeting, delAltGreeting } from "../components/altGreetings.js";
import { setCharacterId } from '../../../../../../script.js';
import { closeDetails } from "../components/modal.js";
import { editCharDebounced } from "../services/characters-service.js";


export function initializeCharDetailsEvents() {
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

    // Trigger when clicking on the separator to close the character details
    $(document).on('click', '#char-sep', function () {
        closeDetails();
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
