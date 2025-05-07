import {
    closeCreationPopup,
    FIELD_CONFIGURATIONS,
    updateLayout,
    updateTokenCount
} from "../components/characterCreation.js";

export function initializeCharacterCreationEvents() {

    Object.values(FIELD_CONFIGURATIONS).forEach(selector => {
        $(selector).on('input', function() {
            updateTokenCount(`#${this.id}`);
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
}

