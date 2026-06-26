import { getIdByAvatar, resetScrollHeight } from '../acm-utils';
// @ts-ignore - External SillyTavern module, resolved by webpack externals
import { setCharacterId, setMenuType } from '/script.js';
import { CharCreationManager } from './CharCreationManager';
import { PresetManager } from './PresetManager';
import { TagManager } from './TagManager';
import { CharListManager } from './CharListManager';
const { Popper } = SillyTavern.libs;

export class ModalManager {
    eventManager: any;
    settings: any;
    st: any;
    charCreationManager: CharCreationManager;
    tagManager: TagManager;
    presetManager: PresetManager;
    charListManager: CharListManager;

    constructor(eventManager: any, settings: any, st: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
        this.charCreationManager = new CharCreationManager(this.eventManager, this.settings, this.st);
        this.tagManager = new TagManager(this.eventManager, this.st);
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
        } catch (error) {
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


        // Put the button before rm_button_group_chats in the form_character_search_form
        $('#rm_button_group_chats').before('<button id="acm-manager" class="menu_button fa-solid fa-users faSmallFontSquareFix" title="Open Char Manager"></button>');

        // Initialize popper.js for dropdowns
        this.initializePoppers();
        this.initializeModalEvents();
        this.initializeUIMenuEvents();
        this.charCreationManager.initializeCharacterCreationEvents();
        this.tagManager.init();
        this.presetManager.init();
        this.charListManager.init();
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
            { placement: 'top' },
        );

        const UISub = Popper.createPopper(
            document.getElementById('acm_dropdown_sub')!,
            document.getElementById('dropdown-submenu')!,
            { placement: 'right' },
        );

        const UIPreset = Popper.createPopper(
            document.getElementById('acm_dropdown_cat')!,
            document.getElementById('preset-submenu')!,
            { placement: 'right' },
        );

        // Store poppers for later use
        window.acmPoppers = {
            Export,
            UI,
            UISub,
            UIPreset,
        };
    }

    /**
     * Opens a modal window and initializes its contents and settings.
     */
    openModal(): void {
        // Memorize some global variables
        if (this.st.characterId !== undefined && this.st.characterId >= 0) {
            this.settings.setMem_avatar(this.st.characters[this.st.characterId].avatar);
        } else {
            this.settings.setMem_avatar(undefined);
        }
        this.settings.setMem_menu(this.st.menuType);

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

        this.eventManager.emit('modal:opened');
    }

    /**
     * Closes the character details section and optionally resets the character selection.
     */
    closeDetails(reset: boolean = true): void {
        if (reset) { setCharacterId(getIdByAvatar(this.settings.mem_avatar)); }

        $('#acm_export_format_popup').hide();
        document.querySelector(`[data-avatar="${this.settings.selectedChar}"]`)?.classList.replace('char_selected', 'char_select');
        document.getElementById('char-details')!.classList.remove('open');
        document.getElementById('char-sep')!.style.display = 'none';
        this.settings.setSelectedChar(undefined);
    }

    /**
     * Closes the modal by resetting certain state variables, hiding the popup.
     */
    closeModal(): void {
        this.closeDetails(false);
        if (this.settings.mem_avatar !== undefined) {
            setCharacterId(getIdByAvatar(this.settings.mem_avatar));
        }
        setMenuType(this.settings.mem_menu);
        this.settings.setMem_avatar(undefined);

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
            'acm_export_button']
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

        // Trigger when the modal is closed to reset some global parameters
        $('#acm_popup_close').on('click', () => {
            this.closeModal();
        });

        // Trigger when clicking on the separator to close the character details
        $(document).on('click', '#char-sep', () => {
            this.closeDetails();
        });

        const $slider = $('#acm_widthSlider');
        const $popup = $('#acm_popup');
        const $preview = $('#acm_popup_preview');

        $slider.on('input', function (this: HTMLElement) {
            $preview.show().css({
                'width': $(this).val() + '%',
                'height': $popup.outerHeight() + 'px',
            });
        }).on('change', (event: JQuery.TriggeredEvent) => {
            const newWidth = $(event.target).val() as string;
            $popup.css('width', newWidth + '%');
            $preview.hide();
            this.settings.updateSetting('popupWidth', newWidth);

            // Refresh virtual scroller after resize
            requestAnimationFrame(() => {
                this.eventManager.emit('charList:handleResize');
            });
        });

        this.eventManager.on('modal:closeDetails', (data: any) => {
            this.closeDetails(data);
        });

        this.eventManager.on('modal:close', () => {
            this.closeModal();
        });
    }

    /**
     * Initializes UI menu events by binding click event handlers to various elements.
     */
    initializeUIMenuEvents(): void {
        $('#acm_switch_ui').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'main' });
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
}
