import { resetScrollHeight } from "../utils.js";
import { closeModal, openModal, showAdvanced, updateLayout } from "../components/modal.js";


export function initializeModalEvents() {
    $('#acm-manager').on('click', function () {
        openModal();
    });

    // Trigger when clicking on a drawer to open/close it
    $(document).on('click', '.altgreetings-drawer-toggle', function () {
        const icon = $(this).find('.idit');
        icon.toggleClass('down up').toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
        $(this).closest('.inline-drawer').children('.inline-drawer-content').stop().slideToggle();

        // Set the height of "autoSetHeight" text areas within the inline-drawer to their scroll height
        $(this).closest('.inline-drawer').find('.inline-drawer-content textarea.autoSetHeight').each(function () {
            resetScrollHeight($(this));
        });
    });

    // Trigger when the modal is closed to reset some global parameters
    $('#acm_popup_close').on("click", function () {
        closeModal();
    });

    // Display character creation popup
    $('#acm_character_create_button').on("click", function () {
        const $popup = $('#acm_create_popup');
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
        showAdvanced = !showAdvanced;
        updateLayout();
    });
}
