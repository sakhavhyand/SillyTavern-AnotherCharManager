import { updateLayout } from "../components/characterCreation.js";
import { getTokenCountAsync, substituteParams } from "../constants/context.js";

export function initializeCharacterCreationEvents() {

    // Adding textarea trigger on input
    const elementsToUpdate = {
        '#acm_create_name': async function () {const acm_create_name=$('#acm_create_name');$('#acm_create_name_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_name.val())))}`);},
        '#acm_create_desc': async function () {const acm_create_desc=$('#acm_create_desc');$('#acm_create_desc_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_desc.val())))}`);},
        '#acm_create_first': async function () {const acm_create_first=$('#acm_create_first');$('#acm_create_first_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_first.val())))}`);},
        '#acm_create_system_prompt': async function () {const acm_create_system_prompt=$('#acm_create_system_prompt');$('#acm_create_system_prompt_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_system_prompt.val())))}`);},
        '#acm_create_post_history_instructions': async function () {const acm_create_post_history_instructions=$('#acm_create_post_history_instructions');$('#acm_create_post_history_instructions_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_post_history_instructions.val())))}`);},
        '#acm_create_personality': async function () {const acm_create_personality=$('#acm_create_personality');$('#acm_create_personality_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_personality.val())))}`);},
        '#acm_create_scenario': async function () {const acm_create_scenario=$('#acm_create_scenario');$('#acm_create_scenario_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_scenario.val())))}`);},
        '#acm_create_depth_prompt': async function () {const acm_create_depth_prompt=$('#acm_create_depth_prompt');$('#acm_create_depth_prompt_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_depth_prompt.val())))}`);},
        '#acm_create_mes_example': async function () {const acm_create_mes_example=$('#acm_create_mes_example');$('#acm_create_mes_example_tokens').html(`Tokens: ${await getTokenCountAsync(substituteParams(String(acm_create_mes_example.val())))}`);},
    };

    Object.keys(elementsToUpdate).forEach(function (id) {
        $(id).on('input', function () {
            elementsToUpdate[id]();
        });
    });

    // Close character creation popup
    $('#acm_create_popup_close').on("click", function () {
        $('acm_create_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () { $('#acm_create_popup').css('display', 'none'); }, 125);
        $('#acm_create_popup').find('input, textarea').each(function() {
            $(this).val('');
        });
        $('#acm_depth_prompt_depth2').val('4');
        $('#acm_depth_prompt_role2').val('system');
        $('#acm_talkativeness_slider2').val('0.5');
        Object.keys(elementsToUpdate).forEach(function(id) {
            elementsToUpdate[id]();
        });
        if ($('#acm_left_panel').hasClass('panel-hidden')){
            updateLayout(false);
        }
    });

    $('#column-separator').on('click', function () {
        if ($('#acm_left_panel').hasClass('panel-hidden')){
            updateLayout(false);
        }
        else {
            updateLayout(true);
        }
    });


}

