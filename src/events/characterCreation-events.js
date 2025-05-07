import { updateLayout } from "../components/characterCreation.js";
import { getTokenCountAsync, substituteParams } from "../constants/context.js";

export function initializeCharacterCreationEvents() {

    const FIELD_CONFIGURATIONS = {
        'name': '#acm_create_name',
        'description': '#acm_create_desc',
        'firstMessage': '#acm_create_first',
        'systemPrompt': '#acm_create_system_prompt',
        'postHistoryInstructions': '#acm_create_post_history_instructions',
        'personality': '#acm_create_personality',
        'scenario': '#acm_create_scenario',
        'depthPrompt': '#acm_create_depth_prompt',
        'messageExample': '#acm_create_mes_example'
    };

    async function updateTokenCount(fieldId) {
        const inputElement = $(fieldId);
        const tokenCountElement = $(`${fieldId}_tokens`);
        const inputValue = String(inputElement.val());
        const tokenCount = await getTokenCountAsync(substituteParams(inputValue));
        tokenCountElement.html(`Tokens: ${tokenCount}`);
    }

    Object.values(FIELD_CONFIGURATIONS).forEach(selector => {
        $(selector).on('input', function() {
            updateTokenCount(`#${this.id}`);
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
        Object.values(FIELD_CONFIGURATIONS).forEach(selector => {
            updateTokenCount(`${selector}`);
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

