import { tags } from "../../../../../tags.js";
import { tagFilterstates } from "../constants/settings.js";
import { tagList } from "../constants/context.js";
import { addTagToCategory } from "../services/settings-service.js";
import { refreshCharListDebounced } from "./charactersList.js";
import { findTag } from "../services/tags-service.js";
import { equalsIgnoreCaseAndAccents } from "../utils.js";

/**
 * Renders a tag as an HTML string based on the provided tag ID and an optional category flag.
 *
 * @param {string} tagId - The identifier of the tag to be displayed.
 * @param {boolean} [isFromCat=false] - Indicates whether the tag is from a category.
 * @return {string} The HTML string representation of the tag. Returns an empty string if the tag ID is not found in the tag list.
 */
export function displayTag( tagId, isFromCat = false ){
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
 * Generates and displays an HTML block of sorted tags with specific styles and attributes
 * and initializes filter states for these tags.
 *
 * @return {void} This function does not return a value.
 */
export function generateTagFilter() {
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
export function tagFilterClick(tag) {
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
    refreshCharListDebounced();
}

/**
 * Creates a tag input field with autocomplete functionality for categories.
 *
 * @param {string} inputSelector - The selector for the input field where tags can be entered.
 * @param {string} listSelector - The selector for the tag list element used for displaying autocomplete suggestions.
 * @param {Object} [tagListOptions={}] - Optional configuration object for customizing the tag list behavior.
 * @return {void} - This method does not return a value.
 */
export function createTagInputCat(inputSelector, listSelector, tagListOptions = {}) {
    $(inputSelector)
        // @ts-ignore
        .autocomplete({
            source: (i, o) => findTag(i, o, listSelector),
            select: (e, u) => selectCatTag(e, u, listSelector, { tagListOptions: tagListOptions }),
            minLength: 0,
        })
        .focus(onTagInputFocus); // <== show a tag list on click
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
