import { equalsIgnoreCaseAndAccents, includesIgnoreCaseAndAccents } from '../utils.js';
import { createTagInput } from '/scripts/tags.js';

export class TagManager {
    constructor(eventManager, st) {
        this.eventManager = eventManager;
        this.st = st;
    }
    /** @enum {string} */
    static SORT_MODE = {
        MANUAL: 'manual',
        ALPHABETICAL: 'alphabetical',
        BY_ENTRIES: 'by_entries',
    };

    /**
     * Initializes multiple tag input components on specified elements with provided configurations.
     * This method sets up tag input fields where tags can be added, managed, and removed.
     *
     * @return {void} Does not return a value.
     */
    init() {
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
     *
     * @param {string} tagId - The identifier of the tag to be displayed.
     * @param {string} [mode='classic'] - The display mode: 'category', 'details', or 'classic'.
     * @return {string} The HTML string representation of the tag. Returns an empty string if the tag ID is not found.
     */
    displayTag(tagId, mode = 'classic') {
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

        const tag = this.st.tagList.find(t => t.id === tagId);
        if (tag) {
            return `<span class="tag" style="background-color: ${tag.color}; color: ${tag.color2};" ${identityAttr}>
                    <span class="tag_name">${tag.name}</span>
                    <i class="${tagClass}"></i>
                </span>`;
        }
        else { return ''; }
    }

    /**
     * Handles the initialization of a tag input field with autocomplete functionality.
     *
     * @param {string|string[]} inputSelector - Selector(s) for the input element.
     * @param {string|string[]} listSelector - Selector(s) for the container where tags are displayed.
     * @param {Object} [tagListOptions={}] - Optional configuration options.
     * @param {string} [mode='classic'] - The behavior mode: 'classic', 'category', or 'multiple'.
     */
    acmCreateTagInput(inputSelector, listSelector, tagListOptions = {}, mode = 'classic') {
        const inputs = Array.isArray(inputSelector) ? inputSelector : [inputSelector];
        const lists = Array.isArray(listSelector) ? listSelector : [listSelector];

        inputs.forEach((selector, index) => {
            $(selector)
                // @ts-ignore
                .autocomplete({
                    source: (i, o) => {
                        if (mode === 'multiple') {
                            return this.acmFindTagMulti(i, o, lists);
                        }
                        return this.findTag(i, o, lists[0]);
                    },
                    select: (e, u) => {
                        // For 'multiple' mode, we pass the specific list that matches this input's index
                        const targetList = mode === 'multiple' ? lists[index] : lists[0];
                        return this.acmSelectTag(e, u, targetList, { tagListOptions, mode, allLists: lists });
                    },
                    minLength: 0,
                })
                .on('focus', function () {
                    $(this).autocomplete('search', $(this).val());
                });
        });
    }

    /**
     * Handles the selection and assignment of tags based on user interaction.
     * The method works with different modes to allow tags to be applied in specific contexts.
     * Tags can be associated with categories, distributed across multiple lists, or handled in a classic manner.
     *
     * @param {Object} event - The event object triggered by the user interaction.
     * @param {Object} ui - The UI interaction object containing details about the selected item.
     * @param {string|Object} listSelector - The selector or jQuery object identifying the DOM element where the tag should be added.
     * @param {Object} options - Additional configuration options for tag manipulation.
     * @param {Object} [options.tagListOptions={}] - Optional override for tag list behavior.
     * @param {string} [options.mode='classic'] - The operational mode determining how tags are managed (`classic`, `multiple`, `category`).
     * @param {Array<string|Object>} [options.allLists=[]] - A collection of selectors or jQuery objects representing all lists that may be affected.
     *
     * @return {boolean} Always returns false to prevent default handling behaviors.
     */
    acmSelectTag(event, ui, listSelector, { tagListOptions = {}, mode = 'classic', allLists = [] } = {}) {
        let tagName = ui.item.value;
        let tag = this.st.tagList.find(t => equalsIgnoreCaseAndAccents(t.name, tagName));

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
                    tagType: tagType
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
     *
     * @param {string} oldKey - The existing tag key to be renamed.
     * @param {string} newKey - The new name for the tag key.
     * @return {object} tag - Returns the updated tag map after the rename operation.
     */
    renameTagKey(oldKey, newKey) {
        const value = this.st.tagMap[oldKey];
        this.st.tagMap[newKey] = value || [];
        delete this.st.tagMap[oldKey];
        this.st.saveSettingsDebounced();
    }

    /**
     * Finds tags based on the provided request, resolving the result with filtered and sorted tags that match the search term.
     *
     * @param {Object} request - The search request containing a `term` property to match tags.
     * @param {Function} resolve - A callback function to resolve the result array.
     * @param {string} listSelector - Selector for the list element containing tags, used to exclude tags already present in the list.
     * @return {Array<string>} - The filtered and sorted list of tag names matching the search term, including the term itself if no exact match is found.
     */
    findTag(request, resolve, listSelector) {
        const skipIds = [...($(listSelector).find('.tag').map((_, el) => $(el).data('tagid')))];
        const haystack = this.st.tagList
            .filter(t => !skipIds.includes(t.id))
            .sort(this.compareTagsForSort.bind(this))
            .map(t => t.name);
        const needle = request.term;
        const hasExactMatch = haystack.findIndex(x => equalsIgnoreCaseAndAccents(x, needle)) !== -1;
        const result = haystack.filter(x => includesIgnoreCaseAndAccents(x, needle));

        if (needle && !hasExactMatch) {
            result.unshift(request.term);
        }
        resolve(result);
    }

    /**
     * Filters suggestions by checking multiple list selectors for existing tags.
     */
    acmFindTagMulti(request, resolve, listSelectors) {
        const selectors = Array.isArray(listSelectors) ? listSelectors : [listSelectors];
        const skipIds = [];

        selectors.forEach(selector => {
            $(selector).find('.tag').each((_, el) => {
                const id = $(el).attr('data-tagid');
                if (id) skipIds.push(id);
            });
        });

        const haystack = this.st.tagList
            .filter(t => !skipIds.includes(t.id))
            .sort(this.compareTagsForSort.bind(this))
            .map(t => t.name);

        const needle = request.term;
        const result = haystack.filter(x => includesIgnoreCaseAndAccents(x, needle));
        resolve(result);
    }

    /**
     * Compares two given tags and returns the compare result
     *
     * @param {Tag: Object} a - First tag
     * @param {Tag: Object} b - Second tag
     * @returns {number} The compare result
     */
    compareTagsForSort(a, b) {
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
