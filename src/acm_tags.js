import { refreshCharList, tagFilterstates } from '../index.js';
import { equalsIgnoreCaseAndAccents, includesIgnoreCaseAndAccents } from './acm_tools.js';
import {tags} from "../../../../../public/scripts/tags.js";

const getContext = SillyTavern.getContext;
const tagList = getContext().tags;
const tag_map = getContext().tagMap;
const power_user = getContext().powerUserSettings;
const saveSettingsDebounced = getContext().saveSettingsDebounced;

export { displayTag, generateTagFilter, tagFilterClick, addListenersTagFilter, renameTagKey, createTagInputCat };


// Function to generate the HTML for displaying a tag
function displayTag( tagId, isFromCat = false ){
    const tagClass = isFromCat ? "fa-solid fa-circle-xmark tag_cat_remove" : "fa-solid fa-circle-xmark tag_remove";
    if (tagList.find(tagList => tagList.id === tagId)) {
        const name = tagList.find(tagList => tagList.id === tagId).name;
        const color = tagList.find(tagList => tagList.id === tagId).color;

        if (tagList.find(tagList => tagList.id === tagId).color2) {
            const color2 = tagList.find(tagList => tagList.id === tagId).color2;

            return `<span id="${tagId}" class="tag" style="background-color: ${color}; color: ${color2};">
                    <span class="tag_name">${name}</span>
                    <i class="${tagClass}"></i>
                </span>`;
        } else {
            return `<span id="${tagId}" class="tag" style="background-color: ${color};">
                    <span class="tag_name">${name}</span>
                    <i class="${tagClass}"></i>
                </span>`;
        }
    }
    else { return ''; }
}

function generateTagFilter() {
    let tagBlock='';

    tagList.sort((a, b) => a.name.localeCompare(b.name));

    tagList.forEach(tag => {
        tagBlock += `<span id="${tag.id}" class="acm_tag" tabIndex="0" style="display: inline; background-color: ${tag.color}; color: ${tag.color2};">
                                <span class="acm_tag_name">${tag.name}</span>
                     </span>`;
        tagFilterstates.set(tag.id, 1);
    });

    $('#tags-list').html(tagBlock);
}

function addListenersTagFilter() {
    const tags = document.querySelectorAll('.acm_tag');

    tags.forEach(tag => {
        tag.addEventListener('click', () => tagFilterClick(tag));
    });
}

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

function renameTagKey(oldKey, newKey) {
    const value = tag_map[oldKey];
    tag_map[newKey] = value || [];
    delete tag_map[oldKey];
    saveSettingsDebounced();
}

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
            select: (e, u) => selectTag(e, u, listSelector, { tagListOptions: tagListOptions }),
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
function selectTag(event, ui, listSelector, { tagListOptions = {} } = {}) {
    let tagName = ui.item.value;
    let tag = tags.find(t => equalsIgnoreCaseAndAccents(t.name, tagName));

    if (!tag) {
        toastr.error("You can't create tag from this interface. Please use the tag editor instead.");
    }

    // unfocus and clear the input
    $(event.target).val('').trigger('input');



    // need to return false to keep the input clear
    return false;
}
