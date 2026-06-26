import { equalsIgnoreCaseAndAccents, escapeHtml, includesIgnoreCaseAndAccents } from '../acm-utils';
// @ts-ignore - External SillyTavern module, resolved by webpack externals
import { createTagInput } from '/scripts/tags.js';

export class TagManager {
    eventManager: any;
    st: any;

    constructor(eventManager: any, st: any) {
        this.eventManager = eventManager;
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
        createTagInput('#acmTagInput', '#acmTagList', { tagOptions: { removable: true } });
        createTagInput('#input_tag', '#tag_List', { tagOptions: { removable: true } });
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
     * Renders a tag as an HTML string based on the provided tag ID and an optional display mode.
     */
    displayTag(tagId: string, mode: string = 'classic'): string {
        let tagClass = 'fa-solid fa-circle-xmark ';
        let identityAttr = `data-tagid="${tagId}"`;

        switch (mode) {
            case 'category':
                tagClass += 'tag_cat_remove';
                break;
            case 'details':
                tagClass += 'tag_remove';
                identityAttr = `id="${tagId}"`;
                break;
            default:
                tagClass += 'tag_acm_remove';
                break;
        }

        const tag = this.st.tagList.find((t: any) => t.id === tagId);
        if (tag) {
            return `<span class="tag" style="background-color: ${tag.color}; color: ${tag.color2};" ${identityAttr}>
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
        });
    }

    /**
     * Handles the selection and assignment of tags based on user interaction.
     */
    acmSelectTag(
        event: any,
        ui: any,
        listSelector: string,
        { tagListOptions = {}, mode = 'classic', allLists = [] }: {
            tagListOptions?: Record<string, any>;
            mode?: string;
            allLists?: string[];
        } = {},
    ): boolean {
        let tagName = ui.item.value;
        let tag = this.st.tagList.find((t: any) => equalsIgnoreCaseAndAccents(t.name, tagName));

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
                    return $(selector).find(`[data-tagid="${tag.id}"]`).length > 0;
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
    findTag(request: any, resolve: (result: string[]) => void, listSelector: string): void {
        const skipIds = [...($(listSelector).find('.tag').map((_: number, el: HTMLElement) => $(el).data('tagid')))];
        const haystack = this.st.tagList
            .filter((t: any) => !skipIds.includes(t.id))
            .sort((a: any, b: any) => this.compareTagsForSort(a, b))
            .map((t: any) => t.name);
        const needle = request.term;
        const hasExactMatch = haystack.findIndex((x: string) => equalsIgnoreCaseAndAccents(x, needle)) !== -1;
        const result = haystack.filter((x: string) => includesIgnoreCaseAndAccents(x, needle));

        if (needle && !hasExactMatch) {
            result.unshift(request.term);
        }
        resolve(result);
    }

    /**
     * Filters suggestions by checking multiple list selectors for existing tags.
     */
    acmFindTagMulti(request: any, resolve: (result: string[]) => void, listSelectors: string | string[]): void {
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
            .sort((a: any, b: any) => this.compareTagsForSort(a, b))
            .map((t: any) => t.name);

        const needle = request.term;
        const result = haystack.filter((x: string) => includesIgnoreCaseAndAccents(x, needle));
        resolve(result);
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
