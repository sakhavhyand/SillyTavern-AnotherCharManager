import {
    closeCreationPopup,
    updateLayout,
    loadAvatar
} from "../components/characterCreation.js";
import { updateTokenCount } from "../utils.js";
import { createData } from "../constants/context.js";

export function initializeCharacterCreationEvents() {

    const elementsToInitialize = {
        '#acm_create_name': async function () { createData.name = String($('#acm_create_name').val()); await updateTokenCount('#acm_create_name');},
        '#acm_create_desc': async function () { createData.description = String($('#acm_create_desc').val()); await updateTokenCount('#acm_create_desc');},
        '#acm_creator_notes_textarea2': function () { createData.creator_notes = String($('#acm_creator_notes_textarea2').val()); },
        '#acm_character_version_textarea2': function () { createData.character_version = String($('#acm_character_version_textarea2').val()); },
        '#acm_create_system_prompt': async function () { createData.system_prompt = String($('#acm_create_system_prompt').val()); await updateTokenCount('#acm_create_system_prompt');},
        '#acm_create_post_history_instructions': async function () { createData.post_history_instructions = String($('#acm_create_post_history_instructions').val()); await updateTokenCount('#acm_create_post_history_instructions');},
        '#acm_creator_textarea2': function () { createData.creator = String($('#acm_creator_textarea2').val()); },
        '#acm_tags_textarea2': function () { createData.tags = String($('#acm_tags_textarea2').val()); },
        '#acm_create_personality': async function () { createData.personality = String($('#acm_create_personality').val()); await updateTokenCount('#acm_create_personality');},
        '#acm_create_scenario': async function () { createData.scenario = String($('#acm_create_scenario').val()); await updateTokenCount('#acm_create_scenario');},
        '#acm_create_mes_example': async function () { createData.mes_example = String($('#acm_create_mes_example').val()); await updateTokenCount('#acm_create_mes_example');},
        '#acm_create_first': async function () { createData.first_message = String($('#acm_create_first').val()); await updateTokenCount('#acm_create_first');},
        '#acm_talkativeness_slider2': function () { createData.talkativeness = Number($('#acm_talkativeness_slider2').val()); },
        '#acm_create_depth_prompt': async function () { createData.depth_prompt_prompt = String($('#acm_create_depth_prompt').val()); await updateTokenCount('#acm_create_depth_prompt');},
        '#acm_depth_prompt_depth2': function () { createData.depth_prompt_depth = Number($('#acm_depth_prompt_depth2').val()); },
        '#acm_depth_prompt_role2': function () { createData.depth_prompt_role = String($('#acm_depth_prompt_role2').val()); },
    };

    Object.keys(elementsToInitialize).forEach(function (id) {
        $(id).on('input', function () {
            elementsToInitialize[id]();
        });
    });

    // Close character creation popup
    $('#acm_create_popup_close').on("click", function () {
        closeCreationPopup();
    });

    $('#column-separator').on('click', function () {
        if ($('#acm_left_panel').hasClass('panel-hidden')){
            updateLayout(false);
        }
        else {
            updateLayout(true);
        }
    });

    // Add the avatar
    $('#acm_add_avatar_button').on('change', async function () {
        await loadAvatar(this);
    });
}

