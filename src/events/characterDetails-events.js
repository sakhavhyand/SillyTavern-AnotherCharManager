import { editCharDebounced } from "../components/characters.js";
import { selectedChar } from "../constants/settings.js";
import { closeDetails } from "../../index.js";
import { getTokenCount, substituteParams } from "../constants/context.js";



export function initializeCharDetailsEvents() {
    // Adding textarea trigger on input
    const elementsToUpdate = {
        '#desc_zone': function () {const descZone=$('#desc_zone');const update={avatar:selectedChar,description:String(descZone.val()),data:{description:String(descZone.val()),},};editCharDebounced(update);$('#desc_Tokens').html(`Tokens: ${getTokenCount(substituteParams(String(descZone.val())))}`);},
        '#firstMes_zone': function () {const firstMesZone=$('#firstMes_zone');const update={avatar:selectedChar,first_mes:String(firstMesZone.val()),data:{first_mes:String(firstMesZone.val()),},};editCharDebounced(update);$('#firstMess_tokens').html(`Tokens: ${getTokenCount(substituteParams(String(firstMesZone.val())))}`);},
        '#acm_creator_notes_textarea': function () {const creatorNotes=$('#acm_creator_notes_textarea');const update={avatar:selectedChar,creatorcomment:String(creatorNotes.val()),data:{creator_notes:String(creatorNotes.val()),},};editCharDebounced(update);},
        '#acm_character_version_textarea': function () { const update = {avatar:selectedChar,data:{character_version:String($('#acm_character_version_textarea').val()),},};editCharDebounced(update);},
        '#acm_system_prompt_textarea': function () {const sysPrompt=$('#acm_system_prompt_textarea');const update={avatar:selectedChar,data:{system_prompt:String(sysPrompt.val()),},};editCharDebounced(update);$('#acm_main_prompt_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(sysPrompt.val())))}`);},
        '#acm_post_history_instructions_textarea': function () {const postHistory=$('#acm_post_history_instructions_textarea');const update={avatar:selectedChar,data:{post_history_instructions:String(postHistory.val()),},};editCharDebounced(update);$('#acm_post_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(postHistory.val())))}`);},
        '#acm_creator_textarea': function () {const update={ avatar:selectedChar,data:{creator:String($('#acm_creator_textarea').val()),},};editCharDebounced(update);},
        '#acm_personality_textarea': function () {const personality=$('#acm_personality_textarea');const update={avatar:selectedChar,personality:String(personality.val()),data:{personality:String(personality.val()),},};editCharDebounced(update);$('#acm_personality_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(personality.val())))}`);},
        '#acm_scenario_pole': function () {const scenario=$('#acm_scenario_pole');const update={avatar:selectedChar,scenario: String(scenario.val()),data:{scenario:String(scenario.val()),},};editCharDebounced(update);$('#acm_scenario_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(scenario.val())))}`);},
        '#acm_depth_prompt_prompt': function () {const depthPrompt=$('#acm_depth_prompt_prompt');const update={avatar:selectedChar,data:{ extensions:{depth_prompt:{prompt:String(depthPrompt.val()),}}},};editCharDebounced(update);$('#acm_char_notes_tokens').text(`Tokens: ${getTokenCount(substituteParams(String(depthPrompt.val())))}`);},
        '#acm_depth_prompt_depth': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{depth:$('#acm_depth_prompt_depth').val(),}}},};editCharDebounced(update);},
        '#acm_depth_prompt_role': function () {const update={avatar:selectedChar,data:{extensions:{depth_prompt:{role:String($('#acm_depth_prompt_role').val()),}}},};editCharDebounced(update);},
        '#acm_talkativeness_slider': function () {const talkativeness=$('#acm_talkativeness_slider');const update={avatar:selectedChar,talkativeness:String(talkativeness.val()),data:{extensions:{talkativeness:String(talkativeness.val()),}}};editCharDebounced(update);},
        '#acm_mes_example_textarea': function () {const example=$('#acm_mes_example_textarea');const update={avatar:selectedChar,mes_example:String(example.val()),data:{mes_example:String(example.val()),},};editCharDebounced(update);$('#acm_messages_examples').text(`Tokens: ${getTokenCount(substituteParams(String(example.val())))}`);},
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
}
