import { timestampToMoment, sortMoments } from '/scripts/utils.js';
import { debounce, escapeHtml, getCardElement, matchesTagRules } from '../acm-utils';
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

        this.eventManager.on('modal:opened', () => {
            this.modalOpen = true;
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
        const dropdownUI = this.settings.getSetting('dropdownUI');
        const hasFilters = this.hasActiveFilters();

        let displayText: string;
        if (dropdownUI) {
            displayText = `Characters: ${total}/${total}`;
        } else {
            const count = hasFilters ? visibleCount : total;
            displayText = `Characters: ${count}/${total}`;
        }

        $('#charNumber').empty().append(displayText);
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

        if (this.settings.searchValue !== '') {
            const searchValueTrimmed = this.settings.searchValue.trim();
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
                case 'tags': {
                    // For tags, we'll search tag names first, then filter characters
                    const tagFuseOptions = {
                        keys: ['name'],
                        threshold: 0.3,
                        includeScore: true,
                    };
                    const tagFuse = new Fuse(this.st.tagList, tagFuseOptions);
                    const matchingTags = tagFuse.search(searchValueTrimmed);
                    const matchingTagIds = matchingTags.map((result: any) => result.item.id);

                    filteredChars = tagFilteredChars.filter((item: any) => {
                        return (this.st.tagMap[item.avatar] || []).some((tagId: string) => matchingTagIds.includes(tagId));
                    });
                    return filteredChars;
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
                    comparison = sortMoments(timestampToMoment(b[sort_data]), timestampToMoment(a[sort_data]));
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

        // Header
        const header = document.createElement('div');
        header.className = 'card__header';
        const title = document.createElement('h3');
        title.className = 'card__header-title';
        title.textContent = charName;
        const meta = document.createElement('p');
        meta.className = 'card__header-meta';
        meta.textContent = `Tags: ${tagCount}`;
        header.appendChild(title);
        header.appendChild(meta);

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
            $('#character-list').html('<span>Hmm, it seems like the character you\'re looking for is hiding out in a secret lair. Try searching for someone else instead.</span>');
        }
        else {
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
        this.eventManager.emit('character_list_refreshed');
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
                    return this.createDropdownContainer(tag.name, charactersForTag.length, 'allTags', tag.id);
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
     */
    createDropdownContainer(title: string, count: number, type: string, content: string): string {
        const isOpen = this.isDropdownSectionOpen(type, content);
        const openClass = isOpen ? ' open' : '';

        return `<div class="dropdown-container${openClass}" data-type="${escapeHtml(type)}" data-content="${escapeHtml(content)}">
        <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">
            ${escapeHtml(title)} (${count})
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
