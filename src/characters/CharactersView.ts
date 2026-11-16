import {
    getCardElement,
    resetScrollHeight,
    attachTabSwipe,
} from '../scripts/acm-utils';
import { MenuManager } from '../core/MenuManager';

export class CharactersView {
    eventManager: any;
    settings: any;
    st: any;
    menuManager: MenuManager;

    constructor(eventManager: any, settings: any, st: any, menuManager: MenuManager) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
        this.menuManager = menuManager;
    }

    init(): void {
        this.initializeDetailsTabs();
        this.initializeTabSwipe();
        this.initializeSwitchUIEvents();
        this.initializeExportButton();
        this.menuManager.register('export', 'acm_export_button', 'acm_export_format_popup', 'left');
        this.menuManager.register('main', 'acm_switch_ui', 'dropdown-ui-menu', 'top-start');
        // '-end' aligns the bottoms so submenus grow upward from the footer
        this.menuManager.register('sub', 'acm_dropdown_sub', 'dropdown-submenu', 'right-end');
        this.menuManager.register('preset', 'acm_dropdown_cat', 'preset-submenu', 'right-end');
        this.applyMenusPlacement();
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

    /**
     * Marks the current display mode (and its parent entries) in the Switch UI menus.
     */
    updateUIMenuActiveState(): void {
        const dropdownUI = Boolean(this.settings.getSetting('dropdownUI'));
        const mode = this.settings.getSetting('dropdownMode');
        const presetId = this.settings.getSetting('presetId');

        $('#acm_switch_classic').toggleClass('active', !dropdownUI);
        $('#acm_dropdown_sub').toggleClass('active', dropdownUI);
        $('#acm_switch_alltags').toggleClass('active', dropdownUI && mode === 'allTags');
        $('#acm_switch_creators').toggleClass('active', dropdownUI && mode === 'creators');
        $('#acm_dropdown_cat').toggleClass('active', dropdownUI && mode === 'custom');
        $('#preset-submenu [data-ui="preset"]').each((_, item) => {
            $(item).toggleClass('active', dropdownUI && mode === 'custom' && $(item).data('preset') === presetId);
        });
    }

    /**
     * Switch UI submenus: to the right of their item, or on a phone (no room on the right)
     * over it and the items above, each submenu stacking upward on its parent menu.
     */
    applyMenusPlacement(): void {
        const placement = $('#acm_popup').hasClass('acm-mobile') ? 'top-start' : 'right-end';
        this.menuManager.setPlacement('sub', placement);
        this.menuManager.setPlacement('preset', placement);
    }

    /**
     * Initializes the export button click handler to toggle the export menu.
     *
     * @return {void}
     */
    initializeExportButton(): void {
        $('#acm_export_button').on('click', () => {
            this.menuManager.toggle('export');
        });
    }

    /**
     * Initializes click event handlers for switching between available UI modes and related dropdown menus.
     *
     * Binds controls that toggle the main, sub, and preset menus, updates the active UI menu state,
     * applies selected UI mode settings, opens the preset manager modal, refreshes the character list
     * when a mode change occurs, and closes all menus after a menu action is handled.
     *
     * @return {void} This method does not return a value.
     */
    initializeSwitchUIEvents(): void {
        $('#acm_switch_ui').on('click', () => {
            this.updateUIMenuActiveState();
            this.menuManager.toggle('main');
        });
        $('#acm_dropdown_sub').on('click', () => {
            this.menuManager.toggle('sub');
        });
        $('#acm_dropdown_cat').on('click', () => {
            this.menuManager.toggle('preset');
        });

        const menuActions: Record<string, (event?: JQuery.TriggeredEvent) => void> = {
            '#acm_switch_classic': () => {
                if (this.settings.getSetting('dropdownUI')) {
                    this.settings.updateSetting('dropdownUI', false);
                    this.eventManager.emit('charList:refresh');
                }
            },
            '#acm_switch_alltags': () => {
                if (!this.settings.getSetting('dropdownUI') || (this.settings.getSetting('dropdownUI') && this.settings.getSetting('dropdownMode') !== 'allTags')) {
                    this.settings.updateSetting('dropdownUI', true);
                    this.settings.updateSetting('dropdownMode', 'allTags');
                    this.eventManager.emit('charList:refresh');
                }
            },
            '#acm_switch_creators': () => {
                if (!this.settings.getSetting('dropdownUI') || (this.settings.getSetting('dropdownUI') && this.settings.getSetting('dropdownMode') !== 'creators')) {
                    this.settings.updateSetting('dropdownUI', true);
                    this.settings.updateSetting('dropdownMode', 'creators');
                    this.eventManager.emit('charList:refresh');
                }
            },
            '#acm_manage_categories': () => {
                this.eventManager.emit('modal:openPresetManager');
            },
            '[data-ui="preset"]': (event?: JQuery.TriggeredEvent) => {
                const presetId = $(event!.target).closest('[data-ui="preset"]').data('preset');
                if (!this.settings.getSetting('dropdownUI') ||
                    (this.settings.getSetting('dropdownUI') && this.settings.getSetting('dropdownMode') !== 'custom') ||
                    (this.settings.getSetting('dropdownUI') && this.settings.getSetting('dropdownMode') === 'custom' && this.settings.getSetting('presetId') !== presetId)) {
                    this.settings.updateSetting('dropdownUI', true);
                    this.settings.updateSetting('dropdownMode', 'custom');
                    this.settings.updateSetting('presetId', presetId);
                    this.eventManager.emit('charList:refresh');
                }
            },
        };

        Object.entries(menuActions).forEach(([selector, action]) => {
            $(document).on('click', selector, (event: JQuery.TriggeredEvent) => {
                action(event);
                this.menuManager.closeAll();
            });
        });
    }
}
