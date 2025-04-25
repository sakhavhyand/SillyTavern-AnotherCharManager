import { refreshCharList } from '../../index.js';
import { equalsIgnoreCaseAndAccents, includesIgnoreCaseAndAccents } from '../utils.js';
import { tags } from "../../../../../tags.js";
import { tagFilterstates } from "../constants/settings.js";
import {
    tagList,
    tagMap,
    power_user,
    saveSettingsDebounced
} from "../constants/context.js";
import {addTagToCategory} from "../services/settings-service.js";

export { displayTag, generateTagFilter, tagFilterClick, addListenersTagFilter, renameTagKey, createTagInputCat };

/**
 * Initializes tag filter states
 */
export function initializeTagFilterStates() {
    tagList.forEach(tag => {
        tagFilterstates.set(tag.id, 1);
    });
}

/**
 * Renders a tag as an HTML string based on the provided tag ID and an optional category flag.
 *
 * @param {string} tagId - The identifier of the tag to be displayed.
 * @param {boolean} [isFromCat=false] - Indicates whether the tag is from a category.
 * @return {string} The HTML string representation of the tag. Returns an empty string if the tag ID is not found in the tag list.
 */
function displayTag( tagId, isFromCat = false ){
    const tagClass = isFromCat ? "fa-solid fa-circle-xmark tag_cat_remove" : "fa-solid fa-circle-xmark tag_remove";
    if (tagList.find(tagList => tagList.id === tagId)) {
        const name = tagList.find(tagList => tagList.id === tagId).name;
        const color = tagList.find(tagList => tagList.id === tagId).color;
        const color2 = tagList.find(tagList => tagList.id === tagId).color2;

        if (isFromCat) {
            return `<span class="tag" style="background-color: ${color}; color: ${color2};" data-tagid="${tagId}">
                        <span class="tag_name">${name}</span>
                        <i class="${tagClass}"></i>
                    </span>`;
        }
        else {
            return `<span id="${tagId}" class="tag" style="background-color: ${color}; color: ${color2};">
                        <span class="tag_name">${name}</span>
                        <i class="${tagClass}"></i>
                    </span>`;
        }
    }
    else { return ''; }
}

/**
 * Generates and displays an HTML block of sorted tags with specific styles and attributes,
 * and initializes filter states for these tags.
 *
 * @return {void} This function does not return a value.
 */
function generateTagFilter() {
    let tagBlock='';

    tagList.sort((a, b) => a.name.localeCompare(b.name));

    tagList.forEach(tag => {
        tagBlock += `<span id="${tag.id}" class="acm_tag" tabIndex="0" style="display: inline; background-color: ${tag.color}; color: ${tag.color2};">
                                <span class="acm_tag_name">${tag.name}</span>
                     </span>`;
    });

    $('#tags-list').html(tagBlock);
}

/**
 * Adds event listeners to elements with the class 'acm_tag' to handle click events.
 * Each click event triggers the `tagFilterClick` function with the corresponding tag element.
 *
 * @return {void} This method does not return a value.
 */
function addListenersTagFilter() {
    const tags = document.querySelectorAll('.acm_tag');

    tags.forEach(tag => {
        tag.addEventListener('click', () => tagFilterClick(tag));
    });
}

/**
 * Handles the click event for a tag filter and updates its state accordingly.
 *
 * The method toggles the tag's state among three possible states:
 * 1 - Default state with no special indication.
 * 2 - Active state indicated by a checkmark and green border.
 * 3 - Disabled state indicated by a cross and red border.
 * Updates the visual representation of the tag and modifies its state in the tagFilterstates map.
 * Also triggers a refresh of the character list based on the updated state.
 *
 * @param {HTMLElement} tag The tag element being clicked. It must contain a child element with
 *                          the class 'acm_tag_name' and must have an id used to track its state.
 *
 * @return {void} This function does not return a value.
 */
function tagFilterClick(tag) {
    const currentState = tagFilterstates.get(tag.id);
    let newState;

    if (currentState === 1) {
        newState = 2;
        tag.querySelector('.acm_tag_name').textContent = '✔️ ' + tag.querySelector('.acm_tag_name').textContent;
        tag.style.borderColor = 'green';
    } else if (currentState === 2) {
        newState = 3;
        tag.querySelector('.acm_tag_name').textContent = tag.querySelector('.acm_tag_name').textContent.replace('✔️ ', '');
        tag.querySelector('.acm_tag_name').textContent = '❌ ' + tag.querySelector('.acm_tag_name').textContent;
        tag.style.borderColor = 'red';
    } else {
        newState = 1;
        tag.querySelector('.acm_tag_name').textContent = tag.querySelector('.acm_tag_name').textContent.replace(/✔️ |❌ /, '');
        tag.style.borderColor = '';
    }

    tagFilterstates.set(tag.id, newState);
    refreshCharList();
}

/**
 * Renames a tag key in the tag map by transferring the corresponding value to a new key
 * and removing the old key from the tag map.
 *
 * @param {string} oldKey - The existing tag key to be renamed.
 * @param {string} newKey - The new name for the tag key.
 * @return {object} tag - Returns the updated tag map after the rename operation.
 */
function renameTagKey(oldKey, newKey) {
    const value = tagMap[oldKey];
    tagMap[newKey] = value || [];
    delete tagMap[oldKey];
    saveSettingsDebounced();
}

/**
 * Finds tags based on the provided request, resolving the result with filtered and sorted tags that match the search term.
 *
 * @param {Object} request - The search request containing a `term` property to match tags.
 * @param {Function} resolve - A callback function to resolve the results array.
 * @param {string} listSelector - Selector for the list element containing tags, used to exclude tags already present in the list.
 * @return {Array<string>} - The filtered and sorted list of tag names matching the search term, including the term itself if no exact match is found.
 */
function findTag(request, resolve, listSelector) {
    const skipIds = [...($(listSelector).find('.tag').map((_, el) => $(el).attr('id')))];
    const haystack = tagList.filter(t => !skipIds.includes(t.id)).sort(compareTagsForSort).map(t => t.name);
    const needle = request.term;
    const hasExactMatch = haystack.findIndex(x => equalsIgnoreCaseAndAccents(x, needle)) !== -1;
    const result = haystack.filter(x => includesIgnoreCaseAndAccents(x, needle));

    if (request.term && !hasExactMatch) {
        result.unshift(request.term);
    }

    resolve(result);
}

/**
 * Create a tag input by enabling the autocomplete feature of a given input element. Tags will be added to the given list.
 *
 * @param {string} inputSelector - the selector for the tag input control
 * @param {string} listSelector - the selector for the list of the tags modified by the input control
 * @param {PrintTagListOptions} [tagListOptions] - Optional parameters for printing the tag list. Can be set to be consistent with the expected behavior of tags in the list that was defined before.
 */
function createTagInputCat(inputSelector, listSelector, tagListOptions = {}) {
    $(inputSelector)
        // @ts-ignore
        .autocomplete({
            source: (i, o) => findTag(i, o, listSelector),
            select: (e, u) => selectCatTag(e, u, listSelector, { tagListOptions: tagListOptions }),
            minLength: 0,
        })
        .focus(onTagInputFocus); // <== show tag list on click
}

/**
 * Compares two given tags and returns the compare result
 *
 * @param {Tag} a - First tag
 * @param {Tag} b - Second tag
 * @returns {number} The compare result
 */
function compareTagsForSort(a, b) {
    const defaultSort = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    if (power_user.auto_sort_tags) {
        return defaultSort;
    }

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

/**
 * Handles the focus event on a tag input field and triggers the autocomplete functionality.
 *
 * This method is intended to initiate an autocomplete search using the input value when the field gains focus.
 *
 * @return {void} This method does not return a value.
 */
function onTagInputFocus() {
    // @ts-ignore
    $(this).autocomplete('search', $(this).val());
}

/**
 * Select a tag and add it to the list. This function is (mostly) used as an event handler for the tag selector control.
 *
 * @param {*} event - The event that fired on autocomplete select
 * @param {*} ui - An Object with label and value properties for the selected option
 * @param {*} listSelector - The selector of the list to print/add to
 * @param {object} param1 - Optional parameters for this method call
 * @param {PrintTagListOptions} [param1.tagListOptions] - Optional parameters for printing the tag list. Can be set to be consistent with the expected behavior of tags in the list that was defined before.
 * @returns {boolean} <c>false</c>, to keep the input clear
 */
function selectCatTag(event, ui, listSelector, { tagListOptions = {} } = {}) {
    let tagName = ui.item.value;
    let tag = tags.find(t => equalsIgnoreCaseAndAccents(t.name, tagName));
    const selectedPreset = $('#preset_selector option:selected').data('preset');
    const selectedCat = $(listSelector).find('label').closest('[data-catid]').data('catid');

    if (!tag) {
        toastr.error("You can't create tag from this interface. Please use the tag editor instead.");
    }

    // unfocus and clear the input
    $(event.target).val('').trigger('input');

    $(listSelector).find('label').before(displayTag(tag.id, true));
    addTagToCategory(selectedPreset, selectedCat, tag.id);

    // need to return false to keep the input clear
    return false;
}
