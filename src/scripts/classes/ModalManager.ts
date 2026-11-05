import { getCardElement, resetScrollHeight } from '../acm-utils';
import { CharCreationManager } from './CharCreationManager';
import { PresetManager } from './PresetManager';
import { TagManager } from './TagManager';
import { CharListManager } from './CharListManager';
import { DEFAULT_ACCENT_COLOR } from '../settings';
const { Popper } = SillyTavern.libs;

// Screen modes, see applyResponsiveMode() and css/responsive.css
// Mobile: phone in portrait (narrow) or in landscape (short)
const MOBILE_QUERY = '(max-width: 600px), (max-height: 500px)';
const COMPACT_QUERY = '(max-width: 1024px)';

export class ModalManager {
    eventManager: any;
    settings: any;
    st: any;
    charCreationManager: CharCreationManager;
    tagManager: TagManager;
    presetManager: PresetManager;
    charListManager: CharListManager;
    /** Phone: an history entry was added when the details opened (see initializeModalEvents). */
    private detailsHistoryEntry = false;

    constructor(eventManager: any, settings: any, st: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
        this.charCreationManager = new CharCreationManager(this.eventManager, this.settings, this.st);
        this.tagManager = new TagManager(this.eventManager, this.settings, this.st);
        this.presetManager = new PresetManager(this.eventManager, this.settings, this.st, this.tagManager);
        this.charListManager = new CharListManager(this.eventManager, this.settings, this.st, this.presetManager);
    }

    /**
     * Initializes the modal component
     */
    async init(): Promise<void> {
        // Load the modal HTML template
        let modalHtml: string;
        try {
            modalHtml = await this.st.renderExtensionTemplateAsync(`third-party/${this.settings.extensionName}/templates`, 'modal');
        } catch (_error) {
            console.error('Error fetching modal.html. This is a normal error if you have the old folder name and you don\'t have to do anything.');
            try {
                modalHtml = await this.st.renderExtensionTemplateAsync(`third-party/${this.settings.oldExtensionName}/templates`, 'modal');
            } catch (secondError) {
                console.error('Error fetching modal.html:', secondError);
                return;
            }
        }
        // Load the extensionMenu button
        const buttonHtml = await this.st.renderExtensionTemplateAsync('third-party/SillyTavern-AnotherCharManager/templates', 'button');

        // Add the extensionMenu button to the extensionsMenu
        $('#extensionsMenu').append(buttonHtml);

        // Add the slash command
        this.st.slashCommandParser.addCommandObject(this.st.slashCommand.fromProps({
            name: 'another-char-manager',
            helpString: 'Open the Another Character Manager UI.',
            callback: () => {
                this.openModal();
                return 'Opening Another Character Manager...';
            },
            returns: 'Opens the Another Character Manager modal window',
        }));

        // Add the modal HTML to the page
        $('#background_template').after(modalHtml);

        const initialWidth = this.settings.getSetting('popupWidth');
        $('#acm_popup').css('width', initialWidth + '%');
        $('#acm_widthSlider').val(initialWidth);

        // ST's color picker (as in its tag manager), with transparency. Created here:
        // the template is sanitized, which strips custom elements.
        const accentColor = this.getAccentColor();
        this.applyAccentColor(accentColor);
        const $picker = $('<toolcool-color-picker id="acm_accentColor"></toolcool-color-picker>')
            .attr({ color: accentColor, title: 'Color of the selection, active states and main buttons', 'popup-position': 'right' })
            .appendTo('#acm_accentColor_slot');
        this.openPickerPanelUpward($picker[0]);


        // Put the button before rm_button_group_chats in the form_character_search_form
        $('#rm_button_group_chats').before('<button id="acm-manager" class="menu_button fa-solid fa-users faSmallFontSquareFix" title="Open Char Manager"></button>');

        this.initializeResponsiveMode();

        // Initialize popper.js for dropdowns
        this.initializePoppers();
        this.initializeModalEvents();
        this.initializeUIMenuEvents();
        this.initializeSettingsMenu();
        this.charCreationManager.initializeCharacterCreationEvents();
        this.tagManager.init();
        this.presetManager.init();
        this.charListManager.init();
    }

    /**
     * Tags the popup with the screen mode so the CSS (responsive.css) and the code share
     * one set of breakpoints: acm-mobile (phone, portrait or landscape) or acm-compact (tablet).
     */
    initializeResponsiveMode(): void {
        const apply = () => this.applyResponsiveMode();
        window.matchMedia(MOBILE_QUERY).addEventListener('change', apply);
        window.matchMedia(COMPACT_QUERY).addEventListener('change', apply);
        // Some resizes (device emulation, a width and a height changing together) don't fire 'change'
        window.addEventListener('resize', apply);
        apply();
    }

    /**
     * Sets acm-mobile / acm-compact on the popup from the current screen size.
     */
    applyResponsiveMode(): void {
        const isMobile = window.matchMedia(MOBILE_QUERY).matches;
        const $popup = $('#acm_popup');
        const wasMobile = $popup.hasClass('acm-mobile');
        $popup
            .toggleClass('acm-mobile', isMobile)
            .toggleClass('acm-compact', !isMobile && window.matchMedia(COMPACT_QUERY).matches);
        // Cards per row and the details view (tabs forced) depend on the phone mode
        if (wasMobile !== isMobile) {
            this.charListManager?.applyCardWidthForColumns();
            this.applyDetailsViewMode();
        }
    }

    /**
     * Initializes popper.js for dropdown positioning
     */
    initializePoppers(): void {
        // Create poppers for various dropdowns
        const Export = Popper.createPopper(
            document.getElementById('acm_export_button')!,
            document.getElementById('acm_export_format_popup')!,
            { placement: 'left' },
        );

        const UI = Popper.createPopper(
            document.getElementById('acm_switch_ui')!,
            document.getElementById('dropdown-ui-menu')!,
            { placement: 'top-start' },
        );

        const UISub = Popper.createPopper(
            document.getElementById('acm_dropdown_sub')!,
            document.getElementById('dropdown-submenu')!,
            // '-end' aligns the bottoms so submenus grow upward from the footer
            { placement: 'right-end' },
        );

        const UIPreset = Popper.createPopper(
            document.getElementById('acm_dropdown_cat')!,
            document.getElementById('preset-submenu')!,
            { placement: 'right-end' },
        );

        const Settings = Popper.createPopper(
            document.getElementById('acm_settings_button'),
            document.getElementById('acm-settings-popup'),
            { placement: 'top-end' },
        );

        // Small screens: the toolbar actions that don't fit go in this menu
        const Tools = Popper.createPopper(
            document.getElementById('acm_toolbar_more')!,
            document.getElementById('acm-toolbar-menu')!,
            { placement: 'bottom-end' },
        );

        // Store poppers for later use
        window.acmPoppers = {
            Export,
            UI,
            UISub,
            UIPreset,
            Settings,
            Tools,
        };
    }

    /**
     * Opens a modal window and initializes its contents and settings.
     */
    openModal(): void {
        // The screen may have changed while the popup was closed without a resize reaching us
        this.applyResponsiveMode();
        document.querySelector('#acm_lock')!.classList.add('is-active');

        // Display the modal with our list layout
        $('#acm_popup').css('display', 'flex').transition({
            opacity: 1,
            duration: 125,
            easing: 'ease-in-out',
        });

        const charSortOrderSelect = document.getElementById('char_sort_order') as HTMLSelectElement;
        Array.from(charSortOrderSelect.options).forEach(option => {
            const field = option.getAttribute('data-field');
            const order = option.getAttribute('data-order');

            option.selected = field === this.settings.getSetting('sortingField') && order === this.settings.getSetting('sortingOrder');
        });

        const favOnly = this.settings.getSetting('favOnly');
        this.charListManager.updateFavFilterButtonState(favOnly);

        const currentCardsPerRow = this.charListManager.clampCardsPerRow(this.settings.getSetting('cardsPerRow'));
        $('#acm_cardsPerRowSlider').val(currentCardsPerRow);
        $('#acm_cardsPerRowValue').text(currentCardsPerRow);

        this.eventManager.emit('modal:opened');

        // Apply persisted tab/dropdown view mode for char-details-desc
        this.applyDetailsViewMode(true);
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
     * Closes the character details section.
     */
    closeDetails(): void {
        $('#acm_export_format_popup').hide();
        getCardElement(this.settings.selectedChar)?.classList.replace('char_selected', 'char_select');
        document.getElementById('char-details')!.classList.remove('open');
        document.getElementById('char-sep')!.style.display = 'none';
        this.settings.setSelectedChar(undefined);
        // Closed by the UI: drop the history entry added at opening (its popstate is then ignored)
        if (this.detailsHistoryEntry) {
            this.detailsHistoryEntry = false;
            history.back();
        }
    }

    /**
     * Closes the modal and hides the popup.
     */
    closeModal(): void {
        // Before closeDetails() clears the selection: the list remembers it for the next opening
        this.eventManager.emit('modal:closing');
        this.closeDetails();

        document.querySelector('#acm_lock')!.classList.remove('is-active');

        const $popup = $('#acm_popup');
        $popup.transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $popup.css('display', 'none');
        }, 125);
        this.eventManager.emit('modal:closed');
    }

    /**
     * Toggles the visibility of dropdown menus based on the provided options.
     */
    toggleDropdownMenus(options: {
        closeAll?: boolean;
        menuToToggle?: string | null;
        updatePoppers?: boolean;
    } = {}): void {
        const {
            closeAll = false,
            menuToToggle = null,
            updatePoppers = true,
        } = options;

        // Menu elements
        const menus: Record<string, { element: string; popper: string }> = {
            main: {
                element: '#dropdown-ui-menu',
                popper: 'UI',
            },
            sub: {
                element: '#dropdown-submenu',
                popper: 'UISub',
            },
            preset: {
                element: '#preset-submenu',
                popper: 'UIPreset',
            },
            export: {
                element: '#acm_export_format_popup',
                popper: 'Export',
            },
            settings: {
                element: '#acm-settings-popup',
                popper: 'Settings',
            },
            tools: {
                element: '#acm-toolbar-menu',
                popper: 'Tools',
            },
        };

        if (closeAll) {
            // Close all menus
            Object.values(menus).forEach(menu => {
                $(menu.element).toggle(false);
            });
        } else if (menuToToggle && menus[menuToToggle]) {
            // Toggle specific menu
            $(menus[menuToToggle].element).toggle();
        }

        // Update poppers if necessary
        if (updatePoppers && window.acmPoppers) {
            Object.values(menus).forEach(menu => {
                if (window.acmPoppers[menu.popper]) {
                    window.acmPoppers[menu.popper].update();
                }
            });
        }
    }

    /**
     * Initializes a function to handle clicks outside of specified dropdown elements.
     */
    initializeDropdownClickOutside(): (event: MouseEvent) => void {
        const excludedElements = [
            'dropdown-ui-menu',
            'dropdown-submenu',
            'preset-submenu',
            'acm_switch_ui',
            'acm_export_format_popup',
            'acm_export_button',
            'acm-settings-popup',
            'acm_settings_button',
            'acm-toolbar-menu',
            'acm_toolbar_more']
            .map(id => document.getElementById(id));

        return (event: MouseEvent) => {
            if (!excludedElements.some(element => element?.contains(event.target as Node))) {
                this.toggleDropdownMenus({ closeAll: true });
            }
        };
    }

    /**
     * Initializes modal-related events for interactive elements within the application.
     */
    initializeModalEvents(): void {
        $('#acm-manager, #acm_open').on('click', () => {
            this.openModal();
        });

        // Trigger when clicking on a drawer to open/close it
        $(document).on('click', '.altgreetings-drawer-toggle', function (this: HTMLElement) {
            const icon = $(this).find('.idit');
            icon.toggleClass('down up').toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
            $(this).closest('.inline-drawer').children('.inline-drawer-content').stop().slideToggle();

            // Set the height of "autoSetHeight" text areas within the inline-drawer to their scroll height
            $(this).closest('.inline-drawer').find('.inline-drawer-content textarea.autoSetHeight').each(function (this: HTMLElement) {
                resetScrollHeight(this);
            });
        });

        // Dropdown mode: top-level sections open one at a time, without the slide animation,
        // so the open section fills the panel at once. Runs before ST's document-level drawer
        // handler and stops it; alt greeting sub-drawers keep the default behavior.
        const descElement = document.getElementById('char-details-desc');
        $(descElement).on('click', '.inline-drawer-header', function (this: HTMLElement, event: JQuery.TriggeredEvent) {
            const drawer = this.parentElement;
            if (drawer?.parentElement !== descElement) return;
            // Let the expand / add greeting buttons do their own thing
            if ($(event.target).closest('.editor_maximize, .acm-add-alt-greeting').length) return;
            event.stopPropagation();

            const expand = !$(this).find('.idit').hasClass('up');
            $(descElement).children('.inline-drawer').each(function (this: HTMLElement) {
                const isOpen = this === drawer && expand;
                $(this).children('.inline-drawer-header').find('.idit')
                    .toggleClass('up fa-circle-chevron-up', isOpen)
                    .toggleClass('down fa-circle-chevron-down', !isOpen);
                $(this).children('.inline-drawer-content').stop(true, true).css('display', isOpen ? '' : 'none');
            });
        });

        // Trigger when the modal is closed to reset some global parameters
        $('#acm_popup_close').on('click', () => {
            this.closeModal();
        });

        // Trigger when clicking on the separator (or, on a phone, the back button) to close the character details
        $(document).on('click', '#char-sep, #acm_details_back', () => {
            this.closeDetails();
        });

        // Phone: the details cover the list, so the system back button (Android) closes them
        // instead of leaving the page. An history entry is added when they open.
        this.eventManager.on('details:opened', () => {
            if (!this.detailsHistoryEntry && $('#acm_popup').hasClass('acm-mobile')) {
                history.pushState({ acmDetails: true }, '');
                this.detailsHistoryEntry = true;
            }
        });
        window.addEventListener('popstate', () => {
            if (!this.detailsHistoryEntry) return;
            this.detailsHistoryEntry = false;
            this.closeDetails();
        });

        const $slider = $('#acm_widthSlider');
        const $popup = $('#acm_popup');
        const $preview = $('#acm_popup_preview');

        // Apply persisted width to slider
        $slider.val(this.settings.getSetting('popupWidth'));
        $('#acm_widthValue').text($slider.val() + '%');

        $slider.on('input', function (this: HTMLElement) {
            const val = $(this).val();
            $preview.show().css({
                'width': val + '%',
                'height': $popup.outerHeight() + 'px',
            });
            $('#acm_widthValue').text(val + '%');
        }).on('change', (event: JQuery.TriggeredEvent) => {
            const newWidth = $(event.target).val() as string;
            $popup.css('width', newWidth + '%');
            $preview.hide();
            this.settings.updateSetting('popupWidth', newWidth);
            // The character list's ResizeObserver re-fits the cards as the popup resizes.
        });

        const $cardsPerRowSlider = $('#acm_cardsPerRowSlider');
        const $cardsPerRowValue = $('#acm_cardsPerRowValue');

        const initialCardsPerRow = this.charListManager.clampCardsPerRow(this.settings.getSetting('cardsPerRow'));
        $cardsPerRowSlider.val(initialCardsPerRow);
        $cardsPerRowValue.text(initialCardsPerRow);

        $cardsPerRowSlider.on('input', (event) => {
            const cols = parseInt(<string>$(event.target).val(), 10);
            $cardsPerRowValue.text(cols);
            this.eventManager.emit('charList:setCardsPerRow', { cols, persist: false });
        }).on('change', (event) => {
            const cols = parseInt(<string>$(event.target).val(), 10);
            $cardsPerRowValue.text(cols);
            this.eventManager.emit('charList:setCardsPerRow', { cols, persist: true });
        });

        // Accent color: ST's picker fires 'change' continuously while picking, so the UI
        // follows live; the save itself is debounced by ST
        $('#acm_accentColor').on('change', (event: any) => {
            const color = event.detail?.rgba;
            if (!this.isValidColor(color)) return;
            this.applyAccentColor(color);
            if (color !== this.settings.getSetting('accentColor')) this.settings.updateSetting('accentColor', color);
        });

        // Setting the picker's color fires its 'change', which applies and saves it
        $('#acm_accentColor_reset').on('click', () => {
            ($('#acm_accentColor')[0] as any).color = DEFAULT_ACCENT_COLOR;
        });

        this.eventManager.on('modal:closeDetails', () => {
            this.closeDetails();
        });

        this.eventManager.on('modal:close', () => {
            this.closeModal();
        });
    }

    /**
     * Returns the saved accent color, or the default one if it's missing or not a valid color.
     */
    getAccentColor(): string {
        const color = this.settings.getSetting('accentColor');
        return this.isValidColor(color) ? color : DEFAULT_ACCENT_COLOR;
    }

    /**
     * The picker's panel always opens below it, off screen from the settings menu at the
     * bottom of the popup, and its fields are hard-coded black on white. It has no option for
     * either, so each panel it creates (in its open shadow DOM, on every opening) gets a style.
     * Watched rather than on click: the picker stops its clicks from reaching outside.
     */
    openPickerPanelUpward(picker: HTMLElement): void {
        const pickerRoot = picker.shadowRoot;
        if (!pickerRoot) return;
        const styleNewPanels = (): void => {
            pickerRoot.querySelectorAll('toolcool-color-picker-popup').forEach(panel => {
                const panelRoot = panel.shadowRoot;
                if (!panelRoot || panelRoot.getElementById('acm_panel_style')) return;
                const style = document.createElement('style');
                style.id = 'acm_panel_style';
                // ST's theme variables reach the shadow DOM
                style.textContent = `
                    .popup { top: auto; bottom: calc(100% - 1px); }
                    .fields input { background: var(--black30a); color: var(--SmartThemeBodyColor); }
                `;
                panelRoot.append(style);
            });
        };
        new MutationObserver(styleNewPanels).observe(pickerRoot, { childList: true, subtree: true });
        styleNewPanels();
    }

    /**
     * Whether the value is a single CSS color (hex, rgb(a)...), safe to put in --acm-accent.
     */
    isValidColor(color: unknown): color is string {
        return typeof color === 'string' && color.trim() !== '' && CSS.supports('color', color);
    }

    /**
     * Sets --acm-accent on the root element. Its shades (--acm-accent-strong...) are derived
     * from it on :root with color-mix(), so they follow.
     */
    applyAccentColor(color: string): void {
        document.documentElement.style.setProperty('--acm-accent', color);
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
     * Initializes UI menu events by binding click event handlers to various elements.
     */
    initializeUIMenuEvents(): void {
        $('#acm_switch_ui').on('click', () => {
            this.updateUIMenuActiveState();
            this.toggleDropdownMenus({ menuToToggle: 'main' });
        });
        $('#acm_settings_button').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'settings' });
        });
        $('#acm_toolbar_more').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'tools' });
        });
        // Each entry of the toolbar menu runs the toolbar button it stands for (hidden on small screens)
        $('#acm-toolbar-menu').on('click', '.dropdown-ui-item[data-acm-target]', (event: JQuery.TriggeredEvent) => {
            const target = $(event.currentTarget).data('acm-target') as string;
            this.toggleDropdownMenus({ closeAll: true });
            $(`#${target}`).trigger('click');
        });
        $('#acm_dropdown_sub').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'sub' });
        });
        $('#acm_dropdown_cat').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'preset' });
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
                this.toggleDropdownMenus({ closeAll: true });
            });
        });

        document.addEventListener('click', this.initializeDropdownClickOutside());
    }

    /**
     * Initializes tab-based view mode for the character details description area.
     * Handles tab switching and the dropdown/tab view toggle button.
     * @private
     */
    initializeSettingsMenu() {
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
