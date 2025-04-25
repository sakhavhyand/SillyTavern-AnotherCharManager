import { openModal } from "../../index.js";


export function initializeModalEvents() {
    $('#acm-manager').on('click', function () {
        openModal();
    });
}
