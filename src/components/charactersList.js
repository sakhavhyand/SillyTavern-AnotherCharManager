import {setCharacterId, setMenuType} from '../../../../../../script.js';
import {debounce, getIdByAvatar} from "../utils.js";
import {characters, getThumbnailUrl, tagList, tagMap} from "../constants/context.js";
import {selectedChar, setSearchValue, setSelectedChar} from "../constants/settings.js";
import {fillAdvancedDefinitions, fillDetails} from "./characters.js";
import {searchAndFilter, sortCharAR} from "../services/charactersList-service.js";
import {getSetting, updateSetting} from "../services/settings-service.js";
import {getPreset} from "../services/presets-service.js";
import {createTagInput} from '../../../../../tags.js';

export const refreshCharListDebounced = debounce(() => { refreshCharList(); }, 200);

// Function to generate the HTML block for a character
function getCharBlock(avatar) {
    const id = getIdByAvatar(avatar);
    const avatarThumb = getThumbnailUrl('avatar', avatar);
    let isFav;

    const parsedThis_avatar = selectedChar !== undefined ? selectedChar : undefined;
    const charClass = (parsedThis_avatar !== undefined && parsedThis_avatar === avatar) ? 'char_selected' : 'char_select';
    if ( characters[id].fav || characters[id].data.extensions.fav ) {
        isFav = 'fav';
    }
    else {
        isFav = '';
    }

    return `<div class="character_item ${charClass} ${isFav}" title="[${characters[id].name} - Tags: ${tagMap[avatar].length}]" data-avatar="${avatar}">
                    <div class="avatar">
                        <img id="img_${avatar}" src="${avatarThumb}" alt="${characters[id].avatar}" draggable="false">
                    </div>
                    <div class="char_name">
                        <div class="char_name_block">
                            <span>${characters[id].name} : ${tagMap[avatar].length}</span>
                        </div>
                    </div>
                </div>`;
}

// Function to display the selected character
export function selectAndDisplay(avatar) {

    // Check if a visible character is already selected
    if(typeof selectedChar !== 'undefined' && document.querySelector(`[data-avatar="${selectedChar}"]`) !== null){
        document.querySelector(`[data-avatar="${selectedChar}"]`).classList.replace('char_selected','char_select');
    }
    setMenuType('character_edit');
    setSelectedChar(avatar);
    setCharacterId(getIdByAvatar(avatar));

    $('#acm_export_format_popup').hide();

    fillDetails(avatar);
    fillAdvancedDefinitions(avatar);

    document.querySelector(`[data-avatar="${avatar}"]`).classList.replace('char_select','char_selected');
    document.getElementById('char-sep').style.display = 'block';
    document.getElementById('char-details').style.removeProperty('display');

}

// Function to refresh the character list based on search and sorting parameters
function refreshCharList() {
    const filteredChars = searchAndFilter();

    if(filteredChars.length === 0){
        $('#character-list').html(`<span>Hmm, it seems like the character you're looking for is hiding out in a secret lair. Try searching for someone else instead.</span>`);
    }
    else {
        const sortingField = getSetting('sortingField');
        const sortingOrder = getSetting('sortingOrder');
        const dropdownUI = getSetting('dropdownUI');
        const dropdownMode = getSetting('dropdownMode');
        const sortedList = sortCharAR(filteredChars, sortingField, sortingOrder);

        if(dropdownUI && dropdownMode === "allTags"){
            $('#character-list').html(dropdownAllTags(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else if(dropdownUI && dropdownMode === "custom"){
            $('#character-list').html(dropdownCustom(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else if(dropdownUI && dropdownMode === "creators"){
            $('#character-list').html(dropdownCreators(sortedList));

            document.querySelectorAll('.dropdown-container').forEach(container => {
                container.querySelector('.dropdown-title').addEventListener('click', () => {
                    container.classList.toggle('open');
                });
            });
        }
        else {
            $('#character-list').html(sortedList.map((item) => getCharBlock(item.avatar)).join(''));
        }
    }
    $('#charNumber').empty().append(`Total characters : ${characters.length}`);
}

/**
 * Generates a dropdown HTML structure categorizing items based on tags
 * and includes a section for items without any associated tags.
 *
 * @param {Array} sortedList A sorted array of objects representing the items with `avatar` property to associate with tags.
 * @return {string} The HTML string containing the dropdown containers for each tag and a section for untagged items.
 */
function dropdownAllTags(sortedList){
    const html = tagList.map(tag => {
        const charactersForTag = sortedList
            .filter(item => tagMap[item.avatar]?.includes(tag.id))
            .map(item => item.avatar);

        if (charactersForTag.length === 0) {
            return '';
        }

        const characterBlocks = charactersForTag.map(character => getCharBlock(character)).join('');

        return `<div class="dropdown-container">
                            <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">${tag.name} (${charactersForTag.length})</div>
                            <div class="dropdown-content character-list">
                                ${characterBlocks}
                            </div>
                        </div>`;
    }).join('');

    const noTagsCharacters = sortedList
        .filter(item => !tagMap[item.avatar] || tagMap[item.avatar].length === 0)
        .map(item => item.avatar);

    const noTagsHtml = noTagsCharacters.length > 0
        ? `<div class="dropdown-container">
                        <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">No Tags (${noTagsCharacters.length})</div>
                        <div class="dropdown-content character-list">
                            ${noTagsCharacters.map(character => getCharBlock(character)).join('')}
                        </div>
                    </div>`
        : '';

    return html + noTagsHtml;
}

/**
 * Generates a custom dropdown structure based on a sorted list and predefined categories.
 *
 * @param {Array} sortedList - An array of objects representing sorted items, where each item contains an `avatar` property.
 * @return {string} A string containing HTML elements for categorized dropdowns.
 */
function dropdownCustom(sortedList){
    const preset = getSetting('presetId');
    const categories = getPreset(preset).categories;
    if (categories.length === 0) {
        return "Looks like our categories went on vacation! 🏖️ Check back when they're done sunbathing!";
    }
    return categories.map(category => {
        const members = category.tags;
        const charactersForCat = sortedList
            .filter(item => members.every(memberId => tagMap[item.avatar]?.includes(String(memberId))))
            .map(item => item.avatar);

        if (charactersForCat.length === 0) {
            return '';
        }

        const characterBlocks = charactersForCat.map(character => getCharBlock(character)).join('');

        return `<div class="dropdown-container">
                            <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">${category.name} (${charactersForCat.length})</div>
                            <div class="dropdown-content character-list">
                                ${characterBlocks}
                            </div>
                        </div>`;
    }).join('');
}

/**
 * Generates dropdown HTML elements grouped by creator names for the provided sorted list of items.
 *
 * @param {Array} sortedList - An array of objects representing sorted items, where each item contains an `avatar` property.
 * @return {string} A concatenated string of HTML dropdowns, where each dropdown represents a creator
 * and their associated avatars. Includes a special case for items with no creator.
 */
function dropdownCreators(sortedList){
    return Object.entries(
        sortedList.reduce((groups, item) => {
            const creator = item.data.creator;

            if (creator) {
                if (!groups[creator]) {
                    groups[creator] = [];
                }
                groups[creator].push(item.avatar);
            } else {
                if (!groups['No Creator']) {
                    groups['No Creator'] = [];
                }
                groups['No Creator'].push(item.avatar);
            }

            return groups;
        }, {})
    ).sort(([creatorA], [creatorB]) => {
        if (creatorA === 'No Creator') return 1;
        if (creatorB === 'No Creator') return -1;
        return creatorA.localeCompare(creatorB);
    })
        .map(([creator, avatars]) => {
            if (avatars.length === 0) {
                return '';
            }

            const characterBlocks = avatars.map(character => getCharBlock(character)).join('');
            const creatorName = creator === 'No Creator' ? "No Creators" : creator;

            return `<div class="dropdown-container">
                <div class="dropdown-title inline-drawer-toggle inline-drawer-header inline-drawer-design">${creatorName} (${avatars.length})</div>
                <div class="dropdown-content character-list">
                    ${characterBlocks}
                </div>
            </div>`;
        }).join('');
}

/**
 * Updates the names of the preset items in a dropdown menu by iterating through each dropdown item,
 * fetching the associated preset using its index, and setting its name as the item's text content.
 *
 * @return {void} This function does not return a value.
 */
export function updateDropdownPresetNames() {
    $('#preset-submenu .dropdown-ui-item').each(function () {
        const presetIndex = $(this).data('preset');
        const newName = getPreset(presetIndex).name;
        if (newName) {
            $(this).text(newName);
        }
    });
}

export function toggleTagsList() {
    const tagsList = document.getElementById('tags-list');

    if (tagsList.classList.contains('open')) {
        // Fermeture de la liste
        setTimeout(() => {
            tagsList.style.minHeight = '0';
            tagsList.style.height = '0';
        }, 10);
    } else {
        // Ouverture de la liste
        setTimeout(() => {
            const calculatedHeight = tagsList.scrollHeight > 80 ? '80px' : (tagsList.scrollHeight + 5) + 'px';
            tagsList.style.minHeight = calculatedHeight;
            tagsList.style.height = calculatedHeight;
        }, 10);
    }

    tagsList.classList.toggle('open');
}

export function toggleCharacterCreationPopup() {
    const $popup = $('#acm_create_popup');

    if ($popup.css('display') === 'none') {

        createTagInput('#acmTagInput', '#acmTagList', { tagOptions: { removable: true } });
        // Affichage du popup
        $popup.css({ 'display': 'flex', 'opacity': 0.0 })
            .addClass('open')
            .transition({
                opacity: 1.0,
                duration: 125,
                easing: 'ease-in-out',
            });
    } else {
        // Masquage du popup
        $popup.css('display', 'none').removeClass('open');
    }
}

export function updateSortOrder(selectedOption) {
    updateSetting('sortingField', selectedOption.data('field'));
    updateSetting('sortingOrder', selectedOption.data('order'));
    refreshCharListDebounced();
}

export function updateSearchFilter(searchText) {
    setSearchValue(String(searchText).toLowerCase());
    refreshCharListDebounced();
}

export function toggleFavoritesOnly(isChecked) {
    updateSetting('favOnly', isChecked);
    refreshCharListDebounced();
}

