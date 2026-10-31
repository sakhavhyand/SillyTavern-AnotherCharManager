import { debounce, escapeHtml, getCardElement, matchesTagRules, sortMoments } from '../acm-utils';
import { VirtualScroller } from './VirtualScroller';
import { CharacterManager } from './CharacterManager';

const { Fuse } = SillyTavern.libs;

/** Horizontal gap between two cards of a row, as a fraction of the card width. */
const CARD_GAP_RATIO = 0.19;
/** Default --acm-card-width (see charactersList.css). */
const DEFAULT_CARD_WIDTH = 110;

export class CharListManager {
    eventManager: any;
    settings: any;
    st: any;
    presetManager: any;
    virtualScroller: VirtualScroller | null;
    dropdownScrollers: Map<string, VirtualScroller>;
    modalOpen: boolean;
    charManager: CharacterManager;
    currentFilteredList: any[];
    /** Message shown while the list is empty, picked once per empty stretch. */
    emptyListMessage: string | null = null;
    /** Selected character and scroll position when ACM was closed, restored when it's reopened. */
    lastSession: { avatar: string | undefined; scrollTop: number } | null = null;
    /** Set when ACM opens, so the first list refresh restores `lastSession`. */
    restoreSessionPending: boolean = false;

    /** Shown (one at random) when no character matches the search and filters. */
    static EMPTY_LIST_MESSAGES: readonly string[] = [
        'Hmm, it seems like the character you\'re looking for is hiding out in a secret lair. Try searching for someone else instead.',
        'Nobody here but us chickens. Try another search or loosen your filters.',
        'This character must have rolled a natural 20 on stealth. Try searching for someone else instead.',
        'The search party came back empty-handed. Maybe try a different name or fewer tags?',
        'Not a single soul matches. Your filters might be a little too picky today.',
        'Looks like everyone went out for coffee. Try another search.',
    ];

    constructor(eventManager: any, settings: any, st: any, presetManager: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
        this.presetManager = presetManager;
        this.virtualScroller = null;
        this.dropdownScrollers = new Map();
        this.modalOpen = false;
        this.currentFilteredList = [];
        this.charManager = new CharacterManager(this.eventManager, this.settings, this.st, this.presetManager.tagManager);
    }

    init(): void {
        this.initializeCharactersListEvents();
        this.initializeToolbarEvents();
        this.charManager.init();
    }

    refreshCharListDebounced = debounce((preserveScroll: boolean) => {
        if (this.modalOpen) this.refreshCharList(preserveScroll);
    }, 200);

    /**
     * Initializes events for the characters list.
     */
    initializeCharactersListEvents(): void {
        // Trigger when a character is selected in the list
        $(document).on('click', '.char_select', (event: JQuery.TriggeredEvent) => {
            this.selectAndDisplay(event.currentTarget.dataset.avatar);
        });

        // Trigger when a character card is double-clicked to open chat
        $(document).on('dblclick', '.char_select', async (event: JQuery.TriggeredEvent) => {
            event.stopPropagation();
            await this.selectAndDisplay(event.currentTarget.dataset.avatar);
            this.charManager.openCharacterChat();
        });

        // Trigger when an already selected character is double-clicked to open chat
        $(document).on('dblclick', '.char_selected', (event: JQuery.TriggeredEvent) => {
            event.stopPropagation();
            this.charManager.openCharacterChat();
        });

        this.eventManager.on('charList:refresh', (data: any) => {
            this.refreshCharListDebounced(data);
        });

        this.eventManager.on('charList:setCardsPerRow', ({ cols, persist }) => {
            this.setCardsPerRow(cols, persist);
        });

        this.eventManager.on('char:select', (data: any) => {
            this.selectAndDisplay(data.avatar, data.scrollTo);
        });

        this.eventManager.on('modal:closing', () => {
            this.lastSession = {
                avatar: this.settings.selectedChar,
                scrollTop: document.getElementById('character-list')?.scrollTop ?? 0,
            };
        });

        this.eventManager.on('modal:opened', () => {
            this.modalOpen = true;
            this.restoreSessionPending = this.lastSession !== null;
            this.refreshCharListDebounced(false);
        });

        this.eventManager.on('modal:closed', () => {
            this.modalOpen = false;
            this.destroyDropdownScrollers();
        });

        this.st.eventSource.on(this.st.event_types.CHARACTER_PAGE_LOADED, () => {
            this.eventManager.emit('charList:refresh');
        });    }

    /**
     * Initializes event listeners for toolbar actions.
     */
    initializeToolbarEvents(): void {
        $(document).on('click', '#acm_tags_filter', this.toggleTagQueries);

        $(document).on('change', '#char_sort_order', (event: JQuery.TriggeredEvent) => {
            const selectedOption = $(event.currentTarget).find(':selected');
            this.settings.updateSetting('sortingField', selectedOption.data('field'));
            this.settings.updateSetting('sortingOrder', selectedOption.data('order'));
            this.refreshCharListDebounced(false);
        });

        $(document).on('input', '#char_search_bar', (event: JQuery.TriggeredEvent) => {
            this.settings.setSearchValue(String($(event.currentTarget).val()).toLowerCase());
            this.refreshCharListDebounced(false);
        });

        // Searching another field applies to the text already typed
        $(document).on('change', '#search_filter_dropdown', () => {
            if (this.settings.searchValue.trim() !== '') this.refreshCharListDebounced(false);
        });

        $('#acm_fav_filter_button').on('click', () => {
            const isEnabled = !this.settings.getSetting('favOnly');
            this.settings.updateSetting('favOnly', isEnabled);
            this.updateFavFilterButtonState(isEnabled);
            this.refreshCharListDebounced(false);
        });

        $('#acm_random_button').on('click', () => {
            this.selectRandomCharacter();
        });

        $('#acm_character_import_button').on('click', function () {
            $('#character_import_file').trigger('click');
        });

        $('#acm_external_import_button').on('click', function () {
            $('#external_import_button').trigger('click');
        });

        $('#acm_character_create_button').on('click', () => {
            this.eventManager.emit('modal:toggleCreation');
        });

        $(document).on('click', '.tag_acm_remove', (event: JQuery.TriggeredEvent) => {
            $(event.currentTarget).closest('[data-tagid]').remove();
            this.refreshCharListDebounced(true);
        });

        $('#acm_emptyMessages_edit')
            .attr('title', 'Edit the messages shown when no character matches. Macros such as {{user}} can be used.')
            .on('click', () => this.editEmptyListMessages());
        this.initializeEmptyListMessagesEditor();

        $('#acm_tagQuery_save').on('click', () => {
            this.saveTagFiltersAsCategory();
        });

        $('#acm_tagQuery_reset').on('click', () => {
            const $lists = $('#acm_mandatoryTags, #acm_facultativeTags, #acm_excludedTags');
            if ($lists.find('[data-tagid]').length === 0) return;
            $lists.empty();
            this.refreshCharListDebounced(true);
        });
    }

    /**
     * Updates the visual state of the favorites filter button.
     */
    updateFavFilterButtonState(isEnabled: boolean): void {
        const button = document.getElementById('acm_fav_filter_button');
        if (!button) return;

        button.classList.toggle('fav_on', isEnabled);
        button.classList.toggle('fav_off', !isEnabled);
        button.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
    }

    /**
     * Updates the character count display based on the current filtering state.
     */
    updateCharacterCount(visibleCount: number): void {
        const total = this.st.characters.length;
        // Same in both UIs: the dropdown views are built from the same filtered list
        const count = this.hasActiveFilters() ? visibleCount : total;

        $('#charNumber').empty().append(`Characters: ${count}/${total}`);
    }

    /**
     * Checks if any active filters are currently applied.
     */
    hasActiveFilters(): boolean {
        const hasSearchValue = this.settings.searchValue && this.settings.searchValue.trim() !== '';
        const hasFavFilter = this.settings.getSetting('favOnly');
        const hasMandatoryTags = $('#acm_mandatoryTags > span[data-tagid]').length > 0;
        const hasFacultativeTags = $('#acm_facultativeTags > span[data-tagid]').length > 0;
        const hasExcludedTags = $('#acm_excludedTags > span[data-tagid]').length > 0;

        return hasSearchValue || hasFavFilter || hasMandatoryTags || hasFacultativeTags || hasExcludedTags;
    }

    /**
     * Checks if a character matches the filters defined in a custom category.
     * Expects a category already passed through `presetManager.normalizeCategory`.
     */
    matchesCategoryFilters(item: any, category: any): boolean {
        return matchesTagRules(this.st.tagMap[item.avatar] || [], {
            mandatory: category.mandatoryTags,
            facultative: category.facultativeTags,
            excluded: category.excludedTags,
        });
    }

    /**
     * Reads the tag IDs currently placed in one of the filter bar's tag lists.
     * Uses attr() rather than data(): jQuery's data() turns numeric-looking
     * legacy IDs (e.g. "1345561466591") into numbers, which then never match.
     */
    getFilterTagIds(listSelector: string): string[] {
        return $(listSelector).children('span[data-tagid]').map((_: number, el: HTMLElement) => $(el).attr('data-tagid')).get().filter(Boolean);
    }

    /**
     * Selects a random character from the currently visible/filtered character list.
     */
    selectRandomCharacter(): void {
        const dropdownUI = this.settings.getSetting('dropdownUI');
        let selectableCharacters: string[] = [];

        if (dropdownUI) {
            // In dropdown mode, only get characters from opened sections
            const openDropdowns = document.querySelectorAll('#character-list .dropdown-container.open');
            openDropdowns.forEach(dropdown => {
                const cards = dropdown.querySelectorAll('[data-avatar]');
                cards.forEach(card => {
                    const avatar = (card as HTMLElement).dataset.avatar;
                    if (avatar) selectableCharacters.push(avatar);
                });
            });
        } else {
            // In classic mode, get all filtered characters
            if (this.currentFilteredList && this.currentFilteredList.length > 0) {
                selectableCharacters = this.currentFilteredList.map((char: any) => char.avatar);
            }
        }

        if (selectableCharacters.length === 0) {
            console.log('No characters to select from');
            return;
        }

        const randomIndex = Math.floor(Math.random() * selectableCharacters.length);
        const randomAvatar = selectableCharacters[randomIndex];

        this.selectAndDisplay(randomAvatar, true);
    }

    /**
     * Filters and searches through a list of characters based on user-defined criteria.
     */
    searchAndFilter(): any[] {
        let filteredChars: any[] = [];
        const charactersCopy = this.settings.getSetting('favOnly')
            ? [...this.st.characters].filter((character: any) => character.fav === true || character.data.extensions.fav === true)
            : [...this.st.characters];

        const tagRules = {
            mandatory: this.getFilterTagIds('#acm_mandatoryTags'),
            facultative: this.getFilterTagIds('#acm_facultativeTags'),
            excluded: this.getFilterTagIds('#acm_excludedTags'),
        };

        // Filtering based on tags
        const tagFilteredChars = charactersCopy.filter((item: any) => matchesTagRules(this.st.tagMap[item.avatar] || [], tagRules));

        const searchValueTrimmed = this.settings.searchValue.trim();
        // Blank search: no filter (as the counter shows), not an empty list
        if (searchValueTrimmed !== '') {
            const searchField = $('#search_filter_dropdown').val() as string;

            let fuseOptions: any;

            switch (searchField) {
                case 'name':
                    fuseOptions = {
                        keys: ['data.name'],
                        threshold: 0.3,
                        includeScore: true,
                    };
                    break;
                case 'creator':
                    fuseOptions = {
                        keys: ['data.creator'],
                        threshold: 0.3,
                        includeScore: true,
                    };
                    break;
                case 'creator_notes':
                    fuseOptions = {
                        keys: ['data.creator_notes'],
                        threshold: 0.3,
                        includeScore: true,
                    };
                    break;
                case 'tags':
                    return this.findCharsByTagName(tagFilteredChars, searchValueTrimmed);
                case 'all': {
                    // Name, creator and creator's notes, plus the characters having a matching tag
                    const fieldMatches = new Fuse(tagFilteredChars, {
                        keys: ['data.name', 'data.creator', 'data.creator_notes'],
                        threshold: 0.3,
                        includeScore: true,
                    }).search(searchValueTrimmed).map((result: any) => result.item);
                    const tagMatches = this.findCharsByTagName(tagFilteredChars, searchValueTrimmed);
                    return [...new Set([...fieldMatches, ...tagMatches])];
                }
            }

            const fuse = new Fuse(tagFilteredChars, fuseOptions);
            const results = fuse.search(searchValueTrimmed);
            filteredChars = results.map((result: any) => result.item);

            return filteredChars;
        }
        else {
            return tagFilteredChars;
        }
    }

    /**
     * Returns the characters having at least one tag whose name matches the search.
     */
    findCharsByTagName(chars: any[], search: string): any[] {
        // Tag names are searched first, then characters are filtered by those tags
        const tagFuse = new Fuse(this.st.tagList, { keys: ['name'], threshold: 0.3, includeScore: true });
        const matchingTagIds = new Set(tagFuse.search(search).map((result: any) => result.item.id));
        return chars.filter((item: any) => (this.st.tagMap[item.avatar] || []).some((tagId: string) => matchingTagIds.has(tagId)));
    }

    /**
     * Sorts an array of character objects based on a specified property and order.
     */
    sortCharAR(chars: any[]): any[] {
        // Read once per sort, not once per comparison
        const sort_data = this.settings.getSetting('sortingField');
        const sort_order = this.settings.getSetting('sortingOrder');
        // Same ordering as localeCompare() with default options, but much faster on big lists
        const collator = new Intl.Collator();

        return chars.sort((a, b) => {
            let comparison = 0;

            switch (sort_data) {
                case 'name':
                    comparison = collator.compare(a[sort_data], b[sort_data]);
                    break;
                case 'tags':
                    comparison = (this.st.tagMap[a.avatar]?.length || 0) - (this.st.tagMap[b.avatar]?.length || 0);
                    break;
                case 'date_last_chat':
                    comparison = b[sort_data] - a[sort_data];
                    break;
                case 'create_date':
                    comparison = sortMoments(this.st.timestampToMoment(b[sort_data]), this.st.timestampToMoment(a[sort_data]));
                    break;
                case 'data_size':
                    comparison = a[sort_data] - b[sort_data];
                    break;
            }
            return sort_order === 'desc' ? comparison * -1 : comparison;
        });
    }

    /**
     * Everything a character card displays, as one string. The virtual scroller
     * keeps an already rendered card while this is unchanged, so list refreshes
     * (after every save, tag change, SillyTavern panel render...) only rebuild
     * the cards that actually changed. Update this when the card shows more data.
     * (Selection state is not included: it's toggled directly on the rendered card.)
     */
    getCardVersion(char: any): string {
        const isFav = Boolean(char?.fav || char?.data?.extensions?.fav);
        const tagCount = this.st.tagMap?.[char?.avatar]?.length ?? 0;
        const avatarVersion = this.charManager.avatarVersions.get(char?.avatar) ?? '';
        return `${char?.name}\n${isFav}\n${tagCount}\n${avatarVersion}`;
    }

    /**
     * Creates and returns a character block element for the given character.
     * Takes the character object directly (the list items already are the
     * characters), avoiding a search through the whole list for every card.
     */
    createCharacterBlock(char: any): HTMLDivElement {
        const avatar: string = char?.avatar ?? '';
        const tagCount = (this.st.tagMap && this.st.tagMap[avatar]) ? this.st.tagMap[avatar].length : 0;

        const charClass = (this.settings.selectedChar !== undefined && this.settings.selectedChar === avatar) ? 'char_selected' : 'char_select';
        const isFav = (char?.fav || char?.data?.extensions?.fav) ? 'fav' : '';

        const charName = char?.name ?? avatar ?? '';
        const charAvatar = char?.avatar ?? avatar ?? '';

        const div = document.createElement('div');
        div.className = `card ${charClass} ${isFav}`;
        // Plain DOM property, not HTML: escaping here would show "&amp;" literally
        div.title = `[${charName} - Tags: ${tagCount}]`;
        div.setAttribute('data-avatar', avatar);

        // Media
        const media = document.createElement('div');
        media.className = 'card__media';
        const img = document.createElement('img');
        img.id = `img_${avatar}`;
        img.src = this.charManager.getAvatarThumbnailUrl(avatar);
        img.alt = charAvatar;
        img.draggable = false;
        media.appendChild(img);

        // Tag count badge over the avatar
        if (tagCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'card__badge';
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-tag';
            badge.appendChild(icon);
            badge.appendChild(document.createTextNode(String(tagCount)));
            media.appendChild(badge);
        }

        // Header
        const header = document.createElement('div');
        header.className = 'card__header';
        const title = document.createElement('h3');
        title.className = 'card__header-title';
        title.textContent = charName;
        header.appendChild(title);

        div.appendChild(media);
        div.appendChild(header);

        return div;
    }


    /**
     * Renders a list of characters as HTML using a virtual scroller mechanism.
     */
    renderCharactersListHTML(sortedList: any[], preserveScroll: boolean = false): void {
        const container = document.getElementById('character-list');

        if (!container) {
            console.error('Container not found');
            return;
        }

        // Update old scroller, if any
        if (this.virtualScroller) {
            this.virtualScroller.setItems(sortedList, preserveScroll);
        }
        else {
            // Calculate the number of elements per line according to width
            this.applyCardWidthForColumns();

            // Create the virtual scroller
            this.virtualScroller = new VirtualScroller({
                container: container,
                items: sortedList,
                renderItem: (item: any) => this.createCharacterBlock(item),
                getItemVersion: (item: any) => this.getCardVersion(item),
                itemHeight: 180, // Height of a line of cards
                itemsPerRow: this.clampCardsPerRow(this.settings.getSetting('cardsPerRow')),
                buffer: 3, // Preload 3 lines before/after
                // Card width is derived from the container width, so re-solve
                // it whenever the list is resized (window, popup width, details panel...)
                onResize: () => this.applyCardWidthForColumns(),
            });
        }
    }

    /**
     * Sets the target number of cards per row and re-fits the card width to it.
     *
     * @param {number} cols - Desired number of cards per row.
     * @param {boolean} [persist=false] - Whether to save this as the new setting
     * (false while dragging the slider, true once the user releases it).
     * @return {void}
     */
    setCardsPerRow(cols: number, persist: boolean = false): void {
        const validCols = this.clampCardsPerRow(cols);
        if (persist) {
            this.settings.updateSetting('cardsPerRow', validCols);
        }
        this.applyCardWidthForColumns(validCols);
    }

    /**
     * Restricts a cards-per-row value to the slider's range (4-18), falling back to 5.
     */
    clampCardsPerRow(cols: unknown): number {
        return Math.min(18,Math.max(4, Math.floor(Number(cols) || 5)));
    }

    /**
     * Sets the --acm-card-width value that fits exactly `cols` cards per row,
     * then refreshes the virtual scroller so it re-measures against the new size.
     *
     * @param {number} [cols] - Optional target column count. Defaults to saved setting.
     * @return {void}
     */
    applyCardWidthForColumns(cols?: number): void {
        const container = document.getElementById('character-list');
        if (!container) return;

        const cardsPerRow = this.clampCardsPerRow(cols ?? this.settings.getSetting('cardsPerRow'));
        const width = this.computeCardWidthForColumns(container, cardsPerRow);
        if (width !== null) {
            container.style.setProperty('--acm-card-width', String(width));
        }

        if (this.virtualScroller) {
            this.virtualScroller.itemsPerRow = cardsPerRow;
            this.virtualScroller.refresh();
        }
    }

    /**
     * Computes the card width (the --acm-card-width value) that fits exactly
     * `cols` cards per row. Rows are grids of `cols` equal columns with each
     * card centered in its column, so a column is the card plus one gap
     * (CARD_GAP_RATIO of the card width, split on both sides). The card's
     * padding and border are inside that width (cards are border-box).
     *
     * @param {HTMLElement} container - The #character-list element.
     * @param {number} cols - Desired number of cards per row.
     * @return {number|null} The card width to assign, or null if it can't be measured.
     */
    computeCardWidthForColumns(container: HTMLElement, cols: number): number | null {
        const validCols = Math.max(1, Math.floor(Number(cols) || 5));
        const availableWidth = this.getContentWidth(container);
        if (availableWidth <= 0) return null;

        return Math.max(Math.floor(availableWidth / (validCols * (1 + CARD_GAP_RATIO))), 20);
    }

    /**
     * Number of cards that fit in a dropdown section at the current card width.
     */
    private calculateItemsPerRow(container: HTMLElement): number {
        // Inherited from #character-list (set by the cards-per-row slider in classic view)
        const cardWidth = parseFloat(getComputedStyle(container).getPropertyValue('--acm-card-width')) || DEFAULT_CARD_WIDTH;
        return Math.max(1, Math.floor(this.getContentWidth(container) / (cardWidth * (1 + CARD_GAP_RATIO))));
    }

    private getContentWidth(container: HTMLElement): number {
        const style = getComputedStyle(container);
        return container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    }

    destroyVirtualScroller(): void {
        if (this.virtualScroller) {
            this.virtualScroller.destroy();
            this.virtualScroller = null;
        }
    }

    /**
     * Selects a character avatar, updates character details, and adjusts the display accordingly.
     */
    async selectAndDisplay(avatar: string, scrollTo: boolean = false): Promise<void> {
        // Unselect the previously selected card, if it is rendered
        getCardElement(this.settings.selectedChar)?.classList.replace('char_selected', 'char_select');
        this.settings.setSelectedChar(avatar);
        $('#acm_export_format_popup').hide();
        window.acmIsUpdatingDetails = true;
        await this.charManager.fillDetails(avatar);
        await this.charManager.fillAdvancedDefinitions(avatar);
        window.acmIsUpdatingDetails = false;

        if (scrollTo && this.virtualScroller) {
            // Use VirtualScroller in classic view
            this.virtualScroller.scrollToAvatar(avatar);
        } else if (scrollTo) {
            // Use native scroll in dropdown view
            getCardElement(avatar)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }

        // Update selected state only if the card is rendered (otherwise it's
        // rendered selected later, from settings.selectedChar)
        getCardElement(avatar)?.classList.replace('char_select', 'char_selected');

        document.getElementById('char-sep')!.style.display = 'block';
        document.getElementById('char-details')!.classList.add('open');
    }

    /**
     * Refreshes the character list by filtering, sorting, and updating the UI.
     */
    refreshCharList(preserveScroll: boolean = false): void {
        const filteredChars = this.searchAndFilter();

        if (filteredChars.length === 0) {
            this.currentFilteredList = [];
            this.destroyVirtualScroller();
            // Picked when the list becomes empty, then kept while it stays empty (no change on every keystroke)
            this.emptyListMessage ??= this.pickEmptyListMessage();
            $('#character-list').empty().append($('<span class="acm_empty_list">').text(this.emptyListMessage));
        }
        else {
            this.emptyListMessage = null;
            const dropdownUI = this.settings.getSetting('dropdownUI');
            const dropdownMode = this.settings.getSetting('dropdownMode');
            const sortedList = this.sortCharAR(filteredChars);

            // Store the current filtered and sorted list for random selection
            this.currentFilteredList = sortedList;

            if (dropdownUI && ['allTags', 'custom', 'creators'].includes(dropdownMode)) {
                this.destroyVirtualScroller();
                this.destroyDropdownScrollers();
                $('#character-list').html(this.generateDropdown(sortedList, dropdownMode));
                const list = document.querySelector('#character-list');
                if (!list) return;
                list.querySelectorAll('.dropdown-container').forEach(container => {
                    const title = container.querySelector('.dropdown-title');
                    const content = container.querySelector('.dropdown-content') as HTMLElement;
                    const data = (container as HTMLElement).dataset;

                    // Restore content for sections that were previously open
                    if (container.classList.contains('open')) {
                        const items = this.getDropdownItems(sortedList, data.type!, data.content!);
                        this.createDropdownScroller(content, items);
                    }

                    title?.addEventListener('click', () => {
                        const isOpen = container.classList.toggle('open');

                        // Save the open/closed state
                        this.updateDropdownSectionState(data.type!, data.content!, isOpen);

                        if (isOpen) {
                            const items = this.getDropdownItems(sortedList, data.type!, data.content!);
                            this.createDropdownScroller(content, items);
                        } else {
                            this.destroyDropdownScrollerForContent(content);
                            content.innerHTML = '';
                        }
                    });
                });
            } else {
                this.renderCharactersListHTML(sortedList, preserveScroll);
            }
        }
        this.updateCharacterCount(filteredChars.length);
        this.updateTagFilterBadge();
        if (this.restoreSessionPending) {
            this.restoreSessionPending = false;
            this.restoreLastSession();
        }
        this.eventManager.emit('character_list_refreshed');
    }

    /**
     * Reopens ACM as it was left: the same character selected (if it still exists and is in
     * the list) and the list scrolled to the same place.
     */
    restoreLastSession(): void {
        const session = this.lastSession;
        if (!session) return;
        const { avatar, scrollTop } = session;
        const isListed = avatar && (this.settings.getSetting('dropdownUI')
            ? this.st.characters.some((c: any) => c.avatar === avatar)
            : this.currentFilteredList.some((c: any) => c.avatar === avatar));
        if (isListed) this.selectAndDisplay(avatar, false);
        // After the scroller has laid out its rows (on the next frame) and the details opened
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const list = document.getElementById('character-list');
            if (list) list.scrollTop = scrollTop;
        }));
    }

    /**
     * The empty-list messages in use: the user's own, or the built-in ones if there are none.
     */
    getEmptyListMessages(): string[] {
        const custom = this.settings.getSetting('emptyListMessages');
        const messages = Array.isArray(custom) ? custom.filter((m: unknown) => typeof m === 'string' && m.trim() !== '') : [];
        return messages.length ? messages : [...CharListManager.EMPTY_LIST_MESSAGES];
    }

    /**
     * Picks one empty-list message at random, with its macros ({{user}}...) replaced.
     */
    pickEmptyListMessage(): string {
        const messages = this.getEmptyListMessages();
        return this.st.substituteParams(messages[Math.floor(Math.random() * messages.length)]);
    }

    /**
     * One editable row of the empty-list messages editor.
     */
    static emptyListMessageRow(message: string = ''): string {
        return `<div class="acm_msgs_row">
                    <input class="text_pole acm_msgs_input" maxlength="300" value="${escapeHtml(message)}" placeholder="Message (macros such as {{user}} are replaced)" title="Macros such as {{user}} are replaced when the message is shown">
                    <div class="menu_button fa-solid fa-trash-can acm_msgs_delete" title="Delete this message"></div>
                </div>`;
    }

    /**
     * Handlers of the empty-list messages editor. Delegated, and bound once: ST's popup shows
     * a copy of the content it's given, so handlers bound to that content wouldn't run.
     */
    initializeEmptyListMessagesEditor(): void {
        $(document).on('click', '#acm_msgs_editor .acm_msgs_add', () => {
            $(CharListManager.emptyListMessageRow()).appendTo('#acm_msgs_editor .acm_msgs_list').find('input').trigger('focus');
        });
        $(document).on('click', '#acm_msgs_editor .acm_msgs_delete', (event: JQuery.TriggeredEvent) => {
            $(event.currentTarget).closest('.acm_msgs_row').remove();
        });
        $(document).on('click', '#acm_msgs_editor .acm_msgs_defaults', () => {
            $('#acm_msgs_editor .acm_msgs_list').html(CharListManager.EMPTY_LIST_MESSAGES.map(m => CharListManager.emptyListMessageRow(m)).join(''));
        });
    }

    /**
     * Opens the editor of the empty-list messages: one row per message, which can be added,
     * edited and deleted. Saved in the extension settings (kept across ACM updates).
     */
    async editEmptyListMessages(): Promise<void> {
        const rows = this.getEmptyListMessages().map(m => CharListManager.emptyListMessageRow(m)).join('');
        const content = `
            <div id="acm_msgs_editor" class="acm_msgs_editor">
                <h3>Empty list messages</h3>
                <div class="acm_msgs_hint">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>One of them is shown at random when no character matches. SillyTavern macros can be used, e.g. <code>{{user}}</code> (your persona's name).</span>
                </div>
                <div class="acm_msgs_list">${rows}</div>
                <div class="acm_msgs_actions">
                    <div class="menu_button menu_button_icon acm_msgs_add"><i class="fa-solid fa-plus"></i><span>Add message</span></div>
                    <div class="menu_button menu_button_icon acm_msgs_defaults"><i class="fa-solid fa-rotate-left"></i><span>Restore defaults</span></div>
                </div>
            </div>`;

        // Read from the popup itself while it closes (it shows a copy of `content`)
        let messages: string[] = [];
        const confirmed = await this.st.callGenericPopup(content, this.st.POPUP_TYPE.CONFIRM, '', {
            okButton: 'Save',
            cancelButton: 'Cancel',
            wide: true,
            allowVerticalScrolling: true,
            onClose: () => {
                messages = $('#acm_msgs_editor .acm_msgs_input').map((_: number, el: HTMLElement) => String($(el).val()).trim()).get().filter(Boolean);
            },
        });
        if (!confirmed) return;

        const isDefault = messages.length === CharListManager.EMPTY_LIST_MESSAGES.length
            && messages.every((m: string, i: number) => m === CharListManager.EMPTY_LIST_MESSAGES[i]);
        // Nothing left, or the built-in list as is: follow the built-in messages (and their future updates)
        this.settings.updateSetting('emptyListMessages', messages.length && !isDefault ? messages : null);
        if (!messages.length) toastr.info('No message left: the built-in messages will be used.');
        // Show the new messages right away if the list is empty
        this.emptyListMessage = null;
        if (this.currentFilteredList.length === 0) this.refreshCharListDebounced(true);
    }

    /**
     * Saves the tag filters (mandatory / at least one / excluded) as a custom category,
     * in the preset the user picks (the active one by default).
     */
    async saveTagFiltersAsCategory(): Promise<void> {
        const rules = {
            mandatoryTags: this.getFilterTagIds('#acm_mandatoryTags'),
            facultativeTags: this.getFilterTagIds('#acm_facultativeTags'),
            excludedTags: this.getFilterTagIds('#acm_excludedTags'),
        };
        if (!rules.mandatoryTags.length && !rules.facultativeTags.length && !rules.excludedTags.length) {
            toastr.warning('Add at least one tag filter first.');
            return;
        }

        const presets: { name: string }[] = this.settings.getSetting('dropdownPresets') ?? [];
        const activePreset = Number(this.settings.getSetting('presetId')) || 0;
        const options = presets.map((preset, index) =>
            `<option value="${index}"${index === activePreset ? ' selected' : ''}>${escapeHtml(preset.name)}</option>`).join('');

        let name = '';
        let presetIndex = activePreset;
        const confirmed = await this.st.callGenericPopup(
            `<h3>Save the tag filters as a category</h3>
            <div class="acm_saveCat_form">
                <label for="acm_saveCat_name">Name</label>
                <input id="acm_saveCat_name" class="text_pole" maxlength="100">
                <label for="acm_saveCat_preset">Preset</label>
                <select id="acm_saveCat_preset">${options}</select>
            </div>`,
            this.st.POPUP_TYPE.CONFIRM,
            '',
            {
                okButton: 'Save',
                onClose: () => {
                    name = String($('#acm_saveCat_name').val() ?? '').trim();
                    presetIndex = Number($('#acm_saveCat_preset').val());
                },
            },
        );
        if (!confirmed) return;
        if (!name) {
            toastr.warning('The category needs a name.');
            return;
        }

        this.presetManager.addPresetCategory(presetIndex, name, rules);
        toastr.success(`Category "${name}" saved in ${presets[presetIndex]?.name ?? 'the preset'}.`);
        // Show it right away if that preset's categories are on screen
        if (this.settings.getSetting('dropdownUI') && this.settings.getSetting('dropdownMode') === 'custom' && presetIndex === activePreset) {
            this.refreshCharListDebounced(true);
        }
    }

    /**
     * Shows on the Tag Query Builder button how many tag filters are applied, since they
     * stay active when its panel is closed (and when ACM is closed and reopened).
     */
    updateTagFilterBadge(): void {
        const count = $('#acm_mandatoryTags, #acm_facultativeTags, #acm_excludedTags').children('span[data-tagid]').length;
        const $button = $('#acm_tags_filter');
        $button.toggleClass('acm_filter_active', count > 0);
        let $badge = $button.children('.acm_filter_badge');
        if (count === 0) {
            $badge.remove();
            $button.attr('title', 'Tag Query Builder');
            return;
        }
        if (!$badge.length) $badge = $('<span class="acm_filter_badge"></span>').appendTo($button);
        $badge.text(count);
        $button.attr('title', `Tag Query Builder (${count} tag filter${count > 1 ? 's' : ''} active)`);
    }

    /**
     * Generates a dropdown menu based on the provided sorted list and type.
     */
    generateDropdown(sortedList: any[], type: string): string {
        const generators: Record<string, () => string> = {
            allTags: () => {
                const tagDropdowns = this.st.tagList.map((tag: any) => {
                    const charactersForTag = sortedList
                        .filter((item: any) => this.st.tagMap[item.avatar]?.includes(tag.id))
                        .map((item: any) => item.avatar);
                    if (charactersForTag.length === 0) return '';
                    return this.createDropdownContainer(tag.name, charactersForTag.length, 'allTags', tag.id, tag);
                }).join('');
                const noTagsCharacters = sortedList
                    .filter((item: any) => !this.st.tagMap[item.avatar] || this.st.tagMap[item.avatar].length === 0)
                    .map((item: any) => item.avatar);
                const noTagsDropdown = noTagsCharacters.length > 0
                    ? this.createDropdownContainer('No Tags', noTagsCharacters.length, 'allTags', 'no-tags')
                    : '';
                return tagDropdowns + noTagsDropdown;
            },
            custom: () => {
                const preset = this.settings.getSetting('presetId');
                const categories = this.presetManager.getPreset(preset).categories;
                if (categories.length === 0) {
                    return 'Looks like our categories went on vacation! 🏖️ Check back when they\'re done sunbathing!';
                }
                return categories.map((category: any, categoryIndex: number) => {
                    // Normalize category for backwards compatibility
                    category = this.presetManager.normalizeCategory(category);

                    const charactersForCat = sortedList
                        .filter((item: any) => this.matchesCategoryFilters(item, category))
                        .map((item: any) => item.avatar);
                    if (charactersForCat.length === 0) return '';
                    return this.createDropdownContainer(
                        category.name,
                        charactersForCat.length,
                        'custom',
                        `${preset}-${categoryIndex}`,
                    );
                }).join('');
            },
            creators: () => {
                const groupedByCreator = sortedList.reduce((groups: Record<string, string[]>, item: any) => {
                    const creator = item.data.creator || 'No Creator';
                    if (!groups[creator]) {
                        groups[creator] = [];
                    }
                    groups[creator].push(item.avatar);
                    return groups;
                }, {});
                return (Object.entries(groupedByCreator) as [string, string[]][])
                    .sort(([creatorA], [creatorB]) => {
                        if (creatorA === 'No Creator') return 1;
                        if (creatorB === 'No Creator') return -1;
                        return creatorA.localeCompare(creatorB);
                    })
                    .map(([creator, avatars]) => {
                        if (avatars.length === 0) return '';
                        const creatorName = creator === 'No Creator' ? 'No Creators' : creator;
                        return this.createDropdownContainer(
                            creatorName,
                            avatars.length,
                            'creator',
                            creator,
                        );
                    }).join('');
            },
        };
        return generators[type]?.() || '';
    }

    /**
     * Creates a dropdown container element as a string of HTML.
     * When a tag is given, the title is drawn as that tag (its colors), so tags
     * sharing a name can still be told apart.
     */
    createDropdownContainer(title: string, count: number, type: string, content: string, tag?: { color?: string; color2?: string }): string {
        const isOpen = this.isDropdownSectionOpen(type, content);
        const openClass = isOpen ? ' open' : '';
        const tagStyle = [
            tag?.color ? `background-color: ${escapeHtml(tag.color)};` : '',
            tag?.color2 ? `color: ${escapeHtml(tag.color2)};` : '',
        ].join(' ');
        const titleHtml = tag
            ? `<span class="dropdown-title-tag" style="${tagStyle}">${escapeHtml(title)}</span>`
            : escapeHtml(title);

        return `<div class="dropdown-container${openClass}" data-type="${escapeHtml(type)}" data-content="${escapeHtml(content)}">
        <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">
            <span class="dropdown-title-text">${titleHtml}</span>
            <span class="dropdown-title-count">${count}</span>
            <i class="dropdown-chevron fa-solid fa-chevron-down"></i>
        </div>
        <div class="dropdown-content character-list">
        </div>
    </div>`;
    }

    /**
     * Checks if a dropdown section should be open based on saved state.
     */
    isDropdownSectionOpen(type: string, content: string): boolean {
        const openSections = this.settings.getSetting('dropdownOpenSections') || {};
        const sectionsForType = openSections[type] || [];
        return sectionsForType.includes(String(content));
    }

    /**
     * Updates the saved state of a dropdown section (opened/closed).
     */
    updateDropdownSectionState(type: string, content: string, isOpen: boolean): void {
        const openSections = this.settings.getSetting('dropdownOpenSections') || {
            allTags: [],
            custom: [],
            creators: [],
        };

        const sectionsForType = openSections[type] || [];
        const contentStr = String(content);
        const index = sectionsForType.indexOf(contentStr);

        if (isOpen && index === -1) {
            sectionsForType.push(contentStr);
        } else if (!isOpen && index !== -1) {
            sectionsForType.splice(index, 1);
        }

        openSections[type] = sectionsForType;
        this.settings.updateSetting('dropdownOpenSections', openSections);
    }

    /**
     * Returns the filtered character items for a dropdown section.
     */
    getDropdownItems(sortedList: any[], type: string, content: string): any[] {
        const filters: Record<string, () => any[]> = {
            allTags: () => sortedList.filter((item: any) => {
                if (content === 'no-tags') {
                    return !this.st.tagMap[item.avatar] || this.st.tagMap[item.avatar].length === 0;
                }
                return this.st.tagMap[item.avatar]?.includes(content);
            }),
            custom: () => {
                const [presetId, categoryIndex] = content.split('-').map(Number);
                const category = this.presetManager.getPreset(presetId).categories[categoryIndex];
                if (!category) return [];
                const normalized = this.presetManager.normalizeCategory(category);
                return sortedList.filter((item: any) => this.matchesCategoryFilters(item, normalized));
            },
            creator: () => sortedList.filter((item: any) => {
                if (content === 'No Creator') return !item.data.creator;
                return item.data.creator === content;
            }),
        };
        return filters[type]?.() || [];
    }

    createDropdownScroller(contentDiv: HTMLElement, items: any[]): void {
        if (items.length === 0) return;
        const itemsPerRow = this.calculateItemsPerRow(contentDiv);
        const scroller = new VirtualScroller({
            container: contentDiv,
            items: items,
            renderItem: (item: any) => this.createCharacterBlock(item),
            getItemVersion: (item: any) => this.getCardVersion(item),
            itemHeight: 180,
            itemsPerRow: itemsPerRow,
            buffer: 2,
            onResize: () => {
                scroller.itemsPerRow = this.calculateItemsPerRow(contentDiv);
                scroller.refresh();
            },
        });
        const key = this.dropdownScrollerKey(contentDiv);
        this.dropdownScrollers.set(key, scroller);
    }

    dropdownScrollerKey(contentDiv: HTMLElement): string {
        const container = contentDiv.closest('.dropdown-container') as HTMLElement;
        return `${container.dataset.type}-${container.dataset.content}`;
    }

    destroyDropdownScrollerForContent(contentDiv: HTMLElement): void {
        const key = this.dropdownScrollerKey(contentDiv);
        const scroller = this.dropdownScrollers.get(key);
        if (scroller) {
            scroller.destroy();
            this.dropdownScrollers.delete(key);
        }
    }

    destroyDropdownScrollers(): void {
        for (const scroller of this.dropdownScrollers.values()) {
            scroller.destroy();
        }
        this.dropdownScrollers.clear();
    }


    /**
     * Toggles the visibility of the tag query list.
     */
    toggleTagQueries(): void {
        const tagsList = document.getElementById('acm_tagQuery');
        if (!tagsList) return;
        if (tagsList.classList.contains('open')) {
            tagsList.style.overflow = 'hidden';
            tagsList.style.minHeight = '0';
            tagsList.style.height = '0';
        } else {
            const calculatedHeight = (tagsList.scrollHeight + 5) + 'px';
            tagsList.style.minHeight = calculatedHeight;
            tagsList.style.height = calculatedHeight;
            setTimeout(() => {
                if (tagsList.classList.contains('open')) {
                    tagsList.style.overflow = 'visible';
                }
            }, 300); // Match the transition duration (0.3s = 300ms)
        }
        tagsList.classList.toggle('open');
    }
}
