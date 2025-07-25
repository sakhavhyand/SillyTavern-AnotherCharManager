import { equalsIgnoreCaseAndAccents, includesIgnoreCaseAndAccents } from '../utils.js';
import { tagFilterstates } from "../constants/settings.js";
import {
    tagList,
    tagMap,
    power_user,
    saveSettingsDebounced
} from "../constants/context.js";

/**
 * Initializes tag filter states
 */
export function initializeTagFilterStates() {
    tagList.forEach(tag => {
        tagFilterstates.set(tag.id, 1);
    });
}

/**
 * Renames a tag key in the tag map by transferring the corresponding value to a new key
 * and removing the old key from the tag map.
 *
 * @param {string} oldKey - The existing tag key to be renamed.
 * @param {string} newKey - The new name for the tag key.
 * @return {object} tag - Returns the updated tag map after the rename operation.
 */
export function renameTagKey(oldKey, newKey) {
    const value = tagMap[oldKey];
    tagMap[newKey] = value || [];
    delete tagMap[oldKey];
    saveSettingsDebounced();
}

/**
 * Finds tags based on the provided request, resolving the result with filtered and sorted tags that match the search term.
 *
 * @param {Object} request - The search request containing a `term` property to match tags.
 * @param {Function} resolve - A callback function to resolve the result array.
 * @param {string} listSelector - Selector for the list element containing tags, used to exclude tags already present in the list.
 * @return {Array<string>} - The filtered and sorted list of tag names matching the search term, including the term itself if no exact match is found.
 */
export function findTag(request, resolve, listSelector) {
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
