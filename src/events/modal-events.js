import { getIdByAvatar, resetScrollHeight } from "../utils.js";
import { mem_avatar, mem_menu, setMem_avatar } from "../constants/settings.js";
import { setCharacterId, setMenuType } from '../../../../../../script.js';
import { closeDetails, openModal } from "../components/modal.js";


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
        closeDetails();
        setCharacterId(getIdByAvatar(mem_avatar));
        setMenuType(mem_menu);
        setMem_avatar(undefined);

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
}
