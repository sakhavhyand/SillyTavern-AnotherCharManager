import { getIdByAvatar, resetScrollHeight } from '../utils.js';
import { setCharacterId, setMenuType } from '/script.js';
import { CharCreationManager } from './CharCreationManager.js';
import { PresetManager } from './PresetManager.js';
import { TagManager } from './TagManager.js';
import { CharListManager } from "./CharListManager.js";
const { Popper } = SillyTavern.libs;

export class ModalManager {
    constructor(eventManager, settings, st) {
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
    async init() {
        // Load the modal HTML template
        let modalHtml;
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
        // on hover, should say: "Open Char Manager"
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
     * @private
     */
    initializePoppers() {
        // Create poppers for various dropdowns
        const Export = Popper.createPopper(
            document.getElementById('acm_export_button'),
            document.getElementById('acm_export_format_popup'),
            { placement: 'left' },
        );

        const UI = Popper.createPopper(
            document.getElementById('acm_switch_ui'),
            document.getElementById('dropdown-ui-menu'),
            { placement: 'top' },
        );

        const UISub = Popper.createPopper(
            document.getElementById('acm_dropdown_sub'),
            document.getElementById('dropdown-submenu'),
            { placement: 'right' },
        );

        const UIPreset = Popper.createPopper(
            document.getElementById('acm_dropdown_cat'),
            document.getElementById('preset-submenu'),
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
     * This method adjusts global variables, updates UI components, and applies specific display and transition effects.
     *
     * @return {void} This function does not return any value.
     */
    openModal() {

        // Memorize some global variables
        if (this.st.characterId !== undefined && this.st.characterId >= 0) {
            this.settings.setMem_avatar(this.st.characters[this.st.characterId].avatar);
        } else {
            this.settings.setMem_avatar(undefined);
        }
        this.settings.setMem_menu(this.st.menuType);

        document.querySelector('#acm_lock').classList.add('is-active');

        // Display the modal with our list layout
        // $('#acm_popup').toggleClass('wide_dialogue_popup large_dialogue_popup');
        $('#acm_popup').css('display', 'flex').transition({
            opacity: 1,
            duration: 125,
            easing: 'ease-in-out',
        });

        const charSortOrderSelect = document.getElementById('char_sort_order');
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
     *
     * @param {boolean} [reset=true] - Indicates whether to reset the character selection. Defaults to true.
     * @return {void} Does not return a value.
     */
    closeDetails( reset = true ) {
        if(reset){ setCharacterId(getIdByAvatar(this.settings.mem_avatar)); }

        $('#acm_export_format_popup').hide();
        document.querySelector(`[data-avatar="${this.settings.selectedChar}"]`)?.classList.replace('char_selected','char_select');
        document.getElementById('char-details').classList.remove('open');
        document.getElementById('char-sep').style.display = 'none';
        this.settings.setSelectedChar(undefined);
    }

    /**
     * Closes the modal by resetting certain state variables, hiding the popup, and resetting its styles and classes.
     *
     * @return {void} This function does not return a value.
     */
    closeModal() {
        this.closeDetails(false);
        if (this.settings.mem_avatar !== undefined) {
            setCharacterId(getIdByAvatar(this.settings.mem_avatar));
        }
        setMenuType(this.settings.mem_menu);
        this.settings.setMem_avatar(undefined);

        document.querySelector('#acm_lock').classList.remove('is-active');

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
     * Toggles the visibility of dropdown menus based on the provided options. Can either close all menus, toggle a specific menu, or update popper positioning for open menus.
     *
     * @param {Object} [options={}] - The configuration options for toggling dropdown menus.
     * @param {boolean} [options.closeAll=false] - If true, closes all dropdown menus regardless of current state.
     * @param {string|null} [options.menuToToggle=null] - The key of the specific menu to toggle. Keys must match the predefined menu identifiers (e.g., "main", "sub", "preset", "export").
     * @param {boolean} [options.updatePoppers=true] - If true, updates the positioning of popper instances associated with the menus.
     *
     * @return {void} This function does not return a value.
     */
    toggleDropdownMenus(options = {}) {
        const {
            closeAll = false,
            menuToToggle = null,
            updatePoppers = true,
        } = options;

        // Éléments de menu
        const menus = {
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
            // Ferme tous les menus
            Object.values(menus).forEach(menu => {
                $(menu.element).toggle(false);
            });
        } else if (menuToToggle && menus[menuToToggle]) {
            // Toggle un menu spécifique
            $(menus[menuToToggle].element).toggle();
        }

        // Mise à jour des poppers si nécessaire
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
     * The function ensures that interactions outside a defined list of dropdown-related elements
     * trigger the closure of all dropdown menus.
     *
     * @return {Function} Returns an event handler function that can be used to detect and handle clicks
     * outside of specified dropdown elements by closing all dropdown menus.
     */
    initializeDropdownClickOutside() {
        const excludedElements = [
            'dropdown-ui-menu',
            'dropdown-submenu',
            'preset-submenu',
            'acm_switch_ui',
            'acm_export_format_popup',
            'acm_export_button']
            .map(id => document.getElementById(id));

        return (event) => {
            if (!excludedElements.some(element => element?.contains(event.target))) {
                this.toggleDropdownMenus({ closeAll: true });
            }
        };
    }

    /**
     * Initializes modal-related events for interactive elements within the application.
     *
     * This method sets up event listeners for modal opening, closing, drawer interactions,
     * and dynamic resizing of modal components. It ties specific UI actions to their
     * corresponding functionalities, enhancing user interactivity with the modal.
     *
     * @return {void} Does not return a value.
     */
    initializeModalEvents() {
        $('#acm-manager, #acm_open').on('click', () => {
            this.openModal();
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
        $('#acm_popup_close').on('click',  () => {
            this.closeModal();
        });

        // Trigger when clicking on the separator to close the character details
        $(document).on('click', '#char-sep',  () => {
            this.closeDetails();
        });

        const $slider = $('#acm_widthSlider');
        const $popup = $('#acm_popup');
        const $preview = $('#acm_popup_preview');

        $slider.on('input', function () {
            $preview.show().css({
                'width': $(this).val() + '%',
                'height': $popup.outerHeight() + 'px',
            });
        }).on('change',  (event) => {
            const newWidth = $(event.target).val();
            $popup.css('width', newWidth + '%');
            $preview.hide();
            this.settings.updateSetting('popupWidth', newWidth);

            // Refresh virtual scroller after resize
            requestAnimationFrame(() => {
                this.eventManager.emit('charList:handleResize');
            });
        });

        this.eventManager.on('modal:closeDetails', (data)=> {
            this.closeDetails(data);
        });

        this.eventManager.on('modal:close', ()=> {
            this.closeModal();
        });
    }

    /**
     * Initializes UI menu events by binding click event handlers to various elements.
     * The method manages dropdown menu toggles, updates settings, refreshes lists, and manages custom categories.
     * Event handlers are dynamically assigned based on specific selectors.
     *
     * @return {void} This method does not return a value.
     */
    initializeUIMenuEvents() {
        $('#acm_switch_ui').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'main' });
        });
        $('#acm_dropdown_sub').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'sub' });
        });
        $('#acm_dropdown_cat').on('click', () => {
            this.toggleDropdownMenus({ menuToToggle: 'preset' });
        });

        const menuActions = {
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
            '[data-ui="preset"]': (event) => {
                const presetId = $(event.target).closest('[data-ui="preset"]').data('preset');
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
            $(document).on('click', selector, (event) => {
                action(event);
                this.toggleDropdownMenus({ closeAll: true });
            });
        });

        document.addEventListener('click', this.initializeDropdownClickOutside());
    }

}
