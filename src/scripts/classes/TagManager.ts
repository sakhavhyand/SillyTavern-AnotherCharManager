import { equalsIgnoreCaseAndAccents, escapeHtml, includesIgnoreCaseAndAccents, withCharacterContext } from '../acm-utils';
import { applyCharacterTagsToMessageDivs, createTagInput, removeTagFromEntity } from '/scripts/tags.js';

/** An autocomplete suggestion for an existing tag. */
interface TagSuggestion {
    label: string;
    value: string;
    tagId?: string;
}

export class TagManager {
    eventManager: any;
    settings: any;
    st: any;

    constructor(eventManager: any, settings: any, st: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
    }

    static SORT_MODE = {
        MANUAL: 'manual',
        ALPHABETICAL: 'alphabetical',
        BY_ENTRIES: 'by_entries',
    } as const;

    /**
     * Initializes multiple tag input components on specified elements with provided configurations.
     */
    init(): void {
        this.initCreationTagInput();
        this.initDetailsTagInput();
        // Grouping the three interdependent inputs using the 'multiple' mode
        const multiInputs = [
            '#acm_mandatoryInput',
            '#acm_facultativeInput',
            '#acm_excludedInput',
        ];
        const multiLists = [
            '#acm_mandatoryTags',
            '#acm_facultativeTags',
            '#acm_excludedTags',
        ];

        this.acmCreateTagInput(multiInputs, multiLists, { tagOptions: { removable: true } }, 'multiple');
    }

    /**
     * Wraps the select handler of an ST tag input so it applies to the given character instead of
     * the active one. ST's handler is synchronous (and can create new tags, which isn't exported).
     */
    redirectTagInput(inputSelector: string, getAvatar: () => string | undefined): void {
        const $input = $(inputSelector);
        // @ts-ignore
        const stSelect = $input.autocomplete('option', 'select');
        // @ts-ignore
        $input.autocomplete('option', 'select', (event: any, ui: any) => withCharacterContext(getAvatar(), () => stSelect(event, ui)));
    }

    /**
     * Tag input of the character creation form. Tags are only listed, and assigned on creation.
     */
    initCreationTagInput(): void {
        createTagInput('#acmTagInput', '#acmTagList', { tagOptions: { removable: true } });
        this.redirectTagInput('#acmTagInput', () => undefined);

        // Runs before ST's document-level '.tag_remove' handler, which would remove the tag from the active character
        $('#acmTagList').on('click', '.tag_remove', (event: JQuery.TriggeredEvent) => {
            event.stopPropagation();
            $(event.currentTarget).closest('.tag').remove();
        });
    }

    /**
     * Tag input of the character details, applied to the character displayed in ACM.
     */
    initDetailsTagInput(): void {
        createTagInput('#input_tag', '#tag_List', { tagOptions: { removable: true } });
        this.redirectTagInput('#input_tag', () => this.settings.selectedChar);

        // Runs before ST's document-level '.tag_remove' handler, which would remove the tag from the active character
        $('#tag_List').on('click', '.tag_remove', (event: JQuery.TriggeredEvent) => {
            event.stopPropagation();
            const avatar = this.settings.selectedChar;
            const tagElement = $(event.currentTarget).closest('.tag');
            const tag = this.st.tagList.find((t: any) => t.id === tagElement.attr('id'));
            if (!avatar || !tag) return;
            removeTagFromEntity(tag, avatar, { tagElement });
            applyCharacterTagsToMessageDivs();
        });
    }

    /**
     * Renders a tag as an HTML string based on the provided tag ID and an optional display mode.
     */
    displayTag(tagId: string, mode: string = 'classic'): string {
        let tagClass = 'fa-solid fa-circle-xmark ';
        let identityAttr = `data-tagid="${escapeHtml(tagId)}"`;

        switch (mode) {
            case 'category':
                tagClass += 'tag_cat_remove';
                break;
            case 'details':
                tagClass += 'tag_remove';
                identityAttr = `id="${escapeHtml(tagId)}"`;
                break;
            default:
                tagClass += 'tag_acm_remove';
                break;
        }

        const tag = this.st.tagList.find((t: any) => t.id === tagId);
        if (tag) {
            return `<span class="tag" style="background-color: ${escapeHtml(tag.color)}; color: ${escapeHtml(tag.color2)};" ${identityAttr}>
                    <span class="tag_name">${escapeHtml(tag.name)}</span>
                    <i class="${tagClass}"></i>
                </span>`;
        }
        else { return ''; }
    }

    /**
     * Handles the initialization of a tag input field with autocomplete functionality.
     */
    acmCreateTagInput(
        inputSelector: string | string[],
        listSelector: string | string[],
        tagListOptions: Record<string, any> = {},
        mode: string = 'classic',
    ): void {
        const inputs = Array.isArray(inputSelector) ? inputSelector : [inputSelector];
        const lists = Array.isArray(listSelector) ? listSelector : [listSelector];

        inputs.forEach((selector, index) => {
            $(selector)
                // @ts-ignore
                .autocomplete({
                    source: (i: any, o: any) => {
                        if (mode === 'multiple') {
                            return this.acmFindTagMulti(i, o, lists);
                        }
                        return this.findTag(i, o, lists[0]);
                    },
                    select: (e: any, u: any) => {
                        // For 'multiple' mode, we pass the specific list that matches this input's index
                        const targetList = mode === 'multiple' ? lists[index] : lists[0];
                        return this.acmSelectTag(e, u, targetList, { tagListOptions, mode, allLists: lists });
                    },
                    minLength: 0,
                })
                .on('focus', function (this: HTMLElement) {
                    // @ts-ignore
                    $(this).autocomplete('search', $(this).val() as string);
                });
            // Draw suggestions as the tags themselves, so tags sharing a name can be told apart
            // @ts-ignore
            $(selector).autocomplete('instance')._renderItem = (ul: JQuery, item: TagSuggestion) => this.renderTagSuggestion(ul, item);
        });
    }

    /**
     * Renders one autocomplete suggestion: the tag in its own colors, or plain text for a typed term.
     */
    renderTagSuggestion(ul: JQuery, item: TagSuggestion): JQuery {
        const tag = item.tagId ? this.st.tagList.find((t: any) => t.id === item.tagId) : undefined;
        const $content = $('<div>');
        if (tag) {
            $('<span class="tag">').text(tag.name).css({ backgroundColor: tag.color || '', color: tag.color2 || '' }).appendTo($content);
        } else {
            $content.text(item.label);
        }
        return $('<li>').append($content).appendTo(ul);
    }

    /**
     * Turns tags into autocomplete suggestions. They carry the tag ID, since names aren't unique.
     */
    toSuggestions(tags: any[]): TagSuggestion[] {
        return tags.map((t: any) => ({ label: t.name, value: t.name, tagId: t.id }));
    }

    /**
     * Handles the selection and assignment of tags based on user interaction.
     */
    acmSelectTag(
        event: any,
        ui: any,
        listSelector: string,
        { tagListOptions: _tagListOptions = {}, mode = 'classic', allLists = [] }: {
            tagListOptions?: Record<string, any>;
            mode?: string;
            allLists?: string[];
        } = {},
    ): boolean {
        // By ID when the suggestion has one: several tags can share a name
        const tagId = ui.item.tagId;
        const tagName = ui.item.value;
        const tag = tagId
            ? this.st.tagList.find((t: any) => t.id === tagId)
            : this.st.tagList.find((t: any) => equalsIgnoreCaseAndAccents(t.name, tagName));

        if (!tag) {
            toastr.error('You can\'t create tag from this interface. Please use the tag editor instead.');
            return false;
        }

        // Clear input
        $(event.target).val('').trigger('input');

        switch (mode) {
            case 'category': {
                const selectedPreset = $('#preset_selector option:selected').data('preset');
                const selectedCat = $(listSelector).find('label').closest('[data-catid]').data('catid');

                // Determine tag type from the parent section
                const tagSection = $(listSelector).closest('[data-tagtype]');
                const tagType = tagSection.length > 0 ? tagSection.data('tagtype') : 'mandatory';

                // Already in this list: the saved category ignores it, so don't show it twice either
                if ($(listSelector).find('[data-tagid]').filter((_: number, el: HTMLElement) => $(el).attr('data-tagid') === tag.id).length) break;
                $(listSelector).find('label').before(this.displayTag(tag.id, 'category'));
                this.eventManager.emit('tag:addTagToCat', {
                    presetId: selectedPreset,
                    categoryId: selectedCat,
                    tagId: tag.id,
                    tagType: tagType,
                });
                break;
            }
            case 'multiple': {
                // Check if tag is already present in ANY of the associated lists
                const isDuplicate = allLists.some(selector => {
                    // attr(), not a selector: IDs are compared as plain strings
                    return $(selector).find('[data-tagid]').filter((_: number, el: HTMLElement) => $(el).attr('data-tagid') === tag.id).length > 0;
                });

                if (!isDuplicate) {
                    // Append ONLY to the list associated with the current input
                    $(listSelector).append(this.displayTag(tag.id));
                    this.eventManager.emit('charList:refresh');
                } else {
                    toastr.warning('This tag is already assigned to one of the requirement lists.');
                }
                break;
            }
            case 'classic':
            default: {
                $(listSelector).append(this.displayTag(tag.id));
                this.eventManager.emit('charList:refresh', true);
                break;
            }
        }

        return false;
    }


    /**
     * Renames a tag key in the tag map by transferring the corresponding value to a new key
     * and removing the old key from the tag map.
     */
    renameTagKey(oldKey: string, newKey: string): void {
        const value = this.st.tagMap[oldKey];
        this.st.tagMap[newKey] = value || [];
        delete this.st.tagMap[oldKey];
        this.st.saveSettingsDebounced();
    }

    /**
     * Finds tags based on the provided request, resolving the result with filtered and sorted tags.
     */
    findTag(request: any, resolve: (result: (TagSuggestion | string)[]) => void, listSelector: string): void {
        // attr(), not data(): data() turns numeric-looking legacy IDs into numbers
        const skipIds = $(listSelector).find('.tag').map((_: number, el: HTMLElement) => $(el).attr('data-tagid')).get();
        const haystack = this.st.tagList
            .filter((t: any) => !skipIds.includes(t.id))
            .sort((a: any, b: any) => this.compareTagsForSort(a, b));
        const needle = request.term;
        const hasExactMatch = haystack.some((t: any) => equalsIgnoreCaseAndAccents(t.name, needle));
        const result: (TagSuggestion | string)[] = this.toSuggestions(haystack.filter((t: any) => includesIgnoreCaseAndAccents(t.name, needle)));

        if (needle && !hasExactMatch) {
            result.unshift(request.term);
        }
        resolve(result);
    }

    /**
     * Filters suggestions by checking multiple list selectors for existing tags.
     */
    acmFindTagMulti(request: any, resolve: (result: TagSuggestion[]) => void, listSelectors: string | string[]): void {
        const selectors = Array.isArray(listSelectors) ? listSelectors : [listSelectors];
        const skipIds: string[] = [];

        selectors.forEach(selector => {
            $(selector).find('.tag').each((_: number, el: HTMLElement) => {
                const id = $(el).attr('data-tagid');
                if (id) skipIds.push(id);
            });
        });

        const haystack = this.st.tagList
            .filter((t: any) => !skipIds.includes(t.id))
            .sort((a: any, b: any) => this.compareTagsForSort(a, b));

        const needle = request.term;
        resolve(this.toSuggestions(haystack.filter((t: any) => includesIgnoreCaseAndAccents(t.name, needle))));
    }

    /**
     * Compares two given tags and returns the compare result
     */
    compareTagsForSort(a: any, b: any): number {
        // default sort: alphabetical, case insensitive
        const defaultSort = a.name.toLowerCase().localeCompare(b.name.toLowerCase());

        // sort on number of entries
        if (this.st.tag_sort_mode === TagManager.SORT_MODE.BY_ENTRIES) {
            return ((b.count || 0) - (a.count || 0)) || defaultSort;
        }

        // alphabetical sort
        if (this.st.tag_sort_mode === TagManager.SORT_MODE.ALPHABETICAL) {
            return defaultSort;
        }

        // manual sort
        if (a.sort_order !== undefined && b.sort_order !== undefined) {
            return a.sort_order - b.sort_order;
        } else if (a.sort_order !== undefined) {
            return -1;
        } else if (b.sort_order !== undefined) {
            return 1;
        } else {
            return defaultSort;
        }
    }
}
