import {
    getCardElement,
    resetScrollHeight,
    attachTabSwipe,
} from '../scripts/acm-utils';

export class CharactersView {
    eventManager: any;
    settings: any;
    st: any;

    constructor(eventManager: any, settings: any, st: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
    }

    init(): void {
        this.initializeDetailsTabs();
        this.initializeTabSwipe();
    }

    /**
     * Shows the details sections as tabs or stacked: the detailsTabMode setting, except on
     * a phone where tabs are always used (the setting is kept for the other screens).
     *
     * @param {boolean} [resetTab=false] - Go back to the first tab even if tabs were already shown.
     */
    applyDetailsViewMode(resetTab: boolean = false): void {
        const setting = !!this.settings.getSetting('detailsTabMode');
        const tabMode = setting || $('#acm_popup').hasClass('acm-mobile');
        const $desc = $('#char-details-desc');
        $('#acm-desc-view-toggle').toggleClass('active', setting);

        if (!tabMode) {
            $desc.removeClass('acm-tab-mode');
            $('#char-details-desc > .inline-drawer').removeClass('acm-section-active');
            return;
        }
        if ($desc.hasClass('acm-tab-mode') && !resetTab) return;

        $desc.addClass('acm-tab-mode');
        // Activate the first tab
        const firstTab = $('#acm-desc-tab-bar .acm-tab-button').first().data('acm-tab');
        $('#acm-desc-tab-bar .acm-tab-button').removeClass('active').first().addClass('active');
        $('#char-details-desc > .inline-drawer').removeClass('acm-section-active');
        const $section = $(`#char-details-desc > .inline-drawer[data-acm-section="${firstTab}"]`).addClass('acm-section-active');
        // Reset textarea heights for the active section
        $section.children('.inline-drawer-content').find('textarea.autoSetHeight').each(function () {
            resetScrollHeight(this);
        });
    }

    /**
     * Touch: a horizontal swipe goes to the previous / next tab, on the details sections
     * (tab view only) and in the character creation popup (main / advanced definitions).
     */
    initializeTabSwipe(): void {
        const desc = document.getElementById('char-details-desc');
        if (desc) {
            attachTabSwipe(desc, '#acm-desc-tab-bar .acm-tab-button', () => desc.classList.contains('acm-tab-mode'));
        }
        const create = document.getElementById('acm_create_popup');
        if (create) {
            attachTabSwipe(create, '#acm_create_popup .acm-create-tab');
        }
    }

    /**
     * Closes the character details section.
     */
    closeDetails(): void {
        $('#acm_export_format_popup').hide();
        getCardElement(this.settings.selectedChar)?.classList.replace('char_selected', 'char_select');
        // Phone: the details scroll as a whole (the summary in landscape), so the next
        // opening must start at the top instead of where this one was left
        $('#char-details, #char-details-block').scrollTop(0);
        document.getElementById('char-details')!.classList.remove('open');
        document.getElementById('char-sep')!.style.display = 'none';
        this.settings.setSelectedChar(undefined);
    }

    /**
     * Initializes tab-based view mode for the character details description area.
     * Handles tab switching and the dropdown/tab view toggle button.
     * @private
     */
    initializeDetailsTabs() {
        // Tab button click handler
        $(document).on('click', '#acm-desc-tab-bar .acm-tab-button', (e) => {
            const $btn = $(e.currentTarget);
            const tabName = $btn.data('acm-tab');

            // Update active tab button
            $('#acm-desc-tab-bar .acm-tab-button').removeClass('active');
            $btn.addClass('active');

            // Update active content section
            $('#char-details-desc > .inline-drawer').removeClass('acm-section-active');
            $(`#char-details-desc > .inline-drawer[data-acm-section="${tabName}"]`).addClass('acm-section-active');

            // Reset textarea heights in the newly visible content
            const $activeContent = $(`#char-details-desc > .inline-drawer[data-acm-section="${tabName}"] > .inline-drawer-content`);
            $activeContent.find('textarea.autoSetHeight').each(function () {
                resetScrollHeight(this);
            });
        });

        // Toggle switch: switch between dropdown and tab view
        $(document).on('click', '#acm-desc-view-toggle', () => {
            const isNowActive = !$('#acm-desc-view-toggle').hasClass('active');
            this.settings.updateSetting('detailsTabMode', isNowActive);
            this.applyDetailsViewMode(true);
        });
    }
}
