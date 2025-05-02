import { updateLayout } from "../components/characterCreation.js";

export function initializeCharacterCreationEvents() {
    // Close character creation popup
    $('#acm_create_popup_close').on("click", function () {
        $('acm_create_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () { $('#acm_create_popup').css('display', 'none'); }, 125);
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

