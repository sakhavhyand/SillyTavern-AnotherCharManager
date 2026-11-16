import { DEFAULT_ACCENT_COLOR } from '../../core/settings';
import { CharactersView } from '../../characters/CharactersView';
import { MenuManager } from '../../core/MenuManager';

// Screen modes, see applyResponsiveMode() and css/responsive.css
// Mobile: phone in portrait (narrow) or in landscape (short)
const MOBILE_QUERY = '(max-width: 600px), (max-height: 500px)';
// Tablet: narrow, or a touch screen (primary pointer, so not a touch laptop used with its
// touchpad) up to 1366px wide, i.e. tablets in landscape
const COMPACT_QUERY = '(max-width: 1024px), (pointer: coarse) and (max-width: 1366px)';

export class ModalManager {
    eventManager: any;
    settings: any;
    st: any;
    charactersView: CharactersView;
    menuManager: MenuManager;

    constructor(eventManager: any, settings: any, st: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
        this.menuManager = new MenuManager();
        this.charactersView = new CharactersView(this.eventManager, this.settings, this.st, this.menuManager);
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
        this.menuManager.init();
        this.menuManager.register('settings', 'acm_settings_button', 'acm-settings-popup', 'top-end');
        // Small screens: the toolbar actions that don't fit go in this menu
        this.menuManager.register('tools', 'acm_toolbar_more', 'acm-toolbar-menu', 'bottom-end');
        this.initializeModalEvents();
        this.initializeUIMenuEvents();
        this.charactersView.init();
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
        const isCompact = !isMobile && window.matchMedia(COMPACT_QUERY).matches;
        const $popup = $('#acm_popup');
        const wasMobile = $popup.hasClass('acm-mobile');
        const wasCompact = $popup.hasClass('acm-compact');
        $popup
            .toggleClass('acm-mobile', isMobile)
            .toggleClass('acm-compact', isCompact);
        // Cards per row depend on the mode (from the width on phones and tablets)
        if (wasMobile !== isMobile || wasCompact !== isCompact) {
            this.eventManager.emit('modal:modeChanged');
        }
        // The details view too (tabs forced on phones), and the submenus placement
        if (wasMobile !== isMobile) {
            this.eventManager.emit('modal:mobileChanged');
        }
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

        this.eventManager.emit('modal:opened');
    }

    /**
     * Tags the popups with acm-editing while one of their text fields has the focus: on small
     * screens the virtual keyboard then takes half the screen, so the CSS hides their footer.
     * Reacting to the focus rather than detecting the keyboard also fits a physical keyboard.
     */
    initializeEditingState(): void {
        const popups = '#acm_popup, #acm_character_popup, #acm_create_popup';
        const isTextField = (el: Element | null) => !!el?.matches(
            'textarea, [contenteditable="true"], input:not([type="range"], [type="checkbox"], [type="radio"], [type="file"], [type="color"], [type="button"])',
        );
        const update = () => {
            const active = document.activeElement;
            $(popups).each(function (this: HTMLElement) {
                $(this).toggleClass('acm-editing', isTextField(active) && this.contains(active));
            });
        };
        // focusout before the next focusin: wait for the new focus, so moving from one field
        // to another doesn't show and hide the footer again
        $(document).on('focusin', popups, update);
        $(document).on('focusout', popups, () => setTimeout(update, 0));
    }

    /**
     * Phone: the details and the advanced definitions / creation popups cover the screen,
     * so the system back button (Android) closes the top one instead of leaving the page.
     *
     * Each of these layers gets an history entry when it opens. Their opening and closing
     * are watched on the elements themselves, whatever closes them (button, other manager...):
     * - closed by the UI: its entry is dropped (history.back(), whose popstate is ignored);
     * - closed by the back button: its entry is already gone, it's closed with `close`.
     */
    initializeBackButton(): void {
        const isDisplayed = (el: HTMLElement) => getComputedStyle(el).display !== 'none';
        const layers: { el: HTMLElement; isOpen: (el: HTMLElement) => boolean; close: () => void }[] = [
            {
                el: document.getElementById('char-details')!,
                isOpen: el => el.classList.contains('open'),
                close: () => this.charactersView.closeDetails(),
            },
            {
                el: document.getElementById('acm_character_popup')!,
                isOpen: isDisplayed,
                close: () => $('#acm_character_cross').trigger('click'),
            },
            {
                el: document.getElementById('acm_create_popup')!,
                isOpen: isDisplayed,
                close: () => $('#acm_create_popup_close').trigger('click'),
            },
        ];
        const wasOpen = new Map(layers.map(layer => [layer.el, layer.isOpen(layer.el)]));
        // Layers that have an history entry, the top one last
        const stack: HTMLElement[] = [];
        let ignoredPops = 0;

        const onChange = () => {
            const opened: HTMLElement[] = [];
            const closed: HTMLElement[] = [];
            for (const layer of layers) {
                const open = layer.isOpen(layer.el);
                if (open === wasOpen.get(layer.el)) continue;
                wasOpen.set(layer.el, open);
                (open ? opened : closed).push(layer.el);
            }
            for (const el of closed) {
                const index = stack.lastIndexOf(el);
                if (index === -1) continue;
                stack.splice(index, 1);
                // One layer closed and another opened at once (e.g. the creation popup closes
                // the details): reuse the entry, as history.back() and pushState would race
                const next = opened.shift();
                if (next) {
                    history.replaceState({ acmLayer: true }, '');
                    stack.push(next);
                } else {
                    ignoredPops++;
                    history.back();
                }
            }
            if (!$('#acm_popup').hasClass('acm-mobile')) return;
            for (const el of opened) {
                history.pushState({ acmLayer: true }, '');
                stack.push(el);
            }
        };

        const observer = new MutationObserver(onChange);
        for (const layer of layers) {
            observer.observe(layer.el, { attributes: true, attributeFilter: ['class', 'style'] });
        }

        // A reload keeps the entries but not the stack: unmark the current one
        if (history.state?.acmLayer) history.replaceState(null, '');

        window.addEventListener('popstate', () => {
            if (ignoredPops > 0) {
                ignoredPops--;
                return;
            }
            const el = stack.pop();
            if (!el) return;
            layers.find(layer => layer.el === el)?.close();
        });
    }

    /**
     * Closes the modal and hides the popup.
     */
    closeModal(): void {
        // Before closeDetails() clears the selection: the list remembers it for the next opening
        this.eventManager.emit('modal:closing');
        this.charactersView.closeDetails();

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
     * Initializes modal-related events for interactive elements within the application.
     */
    initializeModalEvents(): void {
        $('#acm-manager, #acm_open').on('click', () => {
            this.openModal();
        });

        // Trigger when the modal is closed to reset some global parameters
        $('#acm_popup_close').on('click', () => {
            this.closeModal();
        });

        this.initializeBackButton();
        this.initializeEditingState();

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
     * Initializes UI menu events by binding click event handlers to various elements.
     */
    initializeUIMenuEvents(): void {
        $('#acm_settings_button').on('click', () => {
            this.menuManager.toggle('settings');
        });
        $('#acm_toolbar_more').on('click', () => {
            this.menuManager.toggle('tools');
        });
        // Each entry of the toolbar menu runs the toolbar button it stands for (hidden on small screens)
        $('#acm-toolbar-menu').on('click', '.dropdown-ui-item[data-acm-target]', (event: JQuery.TriggeredEvent) => {
            const target = $(event.currentTarget).data('acm-target') as string;
            this.menuManager.closeAll();
            $(`#${target}`).trigger('click');
        });
    }
}
