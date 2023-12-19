// An extension that allows you to manage tags.
import { extension_settings } from '../../../extensions.js';
import { callPopup, getRequestHeaders, getEntitiesList, getThumbnailUrl, this_chid, characters, default_avatar } from '../../../../script.js';
import { humanizedDateTime } from '../../../RossAscends-mods.js';
import { PAGINATION_TEMPLATE } from '../../../utils.js';
import { power_user } from '../../../power-user.js';

const extensionName = 'SillyTavern-TagManager';
const extensionFolderPath = `scripts/extensions/${extensionName}/`;

let popupState = null;
let savedPopupContent = null;
let saveCharactersPage = 0;
const per_page_default = 50;
const defaultSettings = {};

/**
 * Asynchronously loads settings from `extension_settings.tag`,
 * filling in with default settings if some are missing.
 *
 * After loading the settings, it also updates the UI components
 * with the appropriate values from the loaded settings.
 */
async function loadSettings() {
    // Ensure extension_settings.timeline exists
    if (!extension_settings.tag) {
        console.log('Creating extension_settings.tag');
        extension_settings.tag = {};
    }

    // Check and merge each default setting if it doesn't exist
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (!extension_settings.tag.hasOwnProperty(key)) {
            console.log(`Setting default for: ${key}`);
            extension_settings.tag[key] = value;
        }
    }
}

function getEmptyBlock() {
    const icons = ['fa-dragon', 'fa-otter', 'fa-kiwi-bird', 'fa-crow', 'fa-frog'];
    const texts = ['Here be dragons', 'Otterly empty', 'Kiwibunga', 'Pump-a-Rum', 'Croak it'];
    const roll = new Date().getMinutes() % icons.length;
    const emptyBlock = `
    <div class="empty_block">
        <i class="fa-solid ${icons[roll]} fa-4x"></i>
        <h1>${texts[roll]}</h1>
        <p>There are no items to display.</p>
    </div>`;
    return $(emptyBlock);
}

function getCharBlock(item, id) {
    let this_avatar = default_avatar;
    if (item.avatar != 'none') {
        this_avatar = getThumbnailUrl('avatar', item.avatar);
    }
    // Populate the template
    const template = $('#character_tagmanager_template .character_select').clone();
    template.attr({ 'chid': id, 'id': `CharID${id}` });
    template.find('img').attr('src', this_avatar);
    template.find('.avatar').attr('title', item.avatar);
    template.find('.ch_name').text(item.name);
    if (power_user.show_card_avatar_urls) {
        template.find('.ch_avatar_url').text(item.avatar);
    }
    template.find('.ch_fav_icon').css('display', 'none');
    template.toggleClass('is_fav', item.fav || item.fav == 'true');
    template.find('.ch_fav').val(item.fav);

    const description = item.data?.creator_notes?.split('\n', 1)[0] || '';
    if (description) {
        template.find('.ch_description').text(description);
    }
    else {
        template.find('.ch_description').hide();
    }

    const auxFieldName = power_user.aux_field || 'character_version';
    const auxFieldValue = (item.data && item.data[auxFieldName]) || '';
    if (auxFieldValue) {
        template.find('.character_version').text(auxFieldValue);
    }
    else {
        template.find('.character_version').hide();
    }

    // Add to the list
    return template;
}

async function printChars() {

    const storageKey = 'Characters_PerPage';
    const listId = '#list-character-wrapper';
    const entities = getEntitiesList({ doFilter: true });

    $('#character-list-pagination').pagination({
        dataSource: entities,
        pageSize: Number(localStorage.getItem(storageKey)) || per_page_default,
        sizeChangerOptions: [10, 25, 50, 100, 250, 500, 1000],
        pageRange: 1,
        pageNumber: saveCharactersPage || 1,
        position: 'top',
        showPageNumbers: false,
        showSizeChanger: true,
        prevText: '<',
        nextText: '>',
        formatNavigator: PAGINATION_TEMPLATE,
        showNavigator: true,
        callback: function (data) {
            $(listId).empty();
            if (!data.length) {
                $(listId).append(getEmptyBlock());
            }
            data
                .filter(i => i.type === 'character')
                .forEach(i => $(listId).append(getCharBlock(i.item, i.id)));

        },
        afterSizeSelectorChange: function (e) {
            localStorage.setItem(storageKey, e.target.value);
        },
        afterPaging: function (e) {
            saveCharactersPage = e;
        },
        afterRender: function () {
            $(listId).scrollTop(0);
        },
    });
}

async function getChars() {
    var response = await fetch('/api/characters/all', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({
            '': '',
        }),
    });
    if (response.ok === true) {
        var getData = ''; //RossAscends: reset to force array to update to account for deleted character.
        getData = await response.json();
        const load_ch_count = Object.getOwnPropertyNames(getData);
        for (var i = 0; i < load_ch_count.length; i++) {
            characters[i] = [];
            characters[i] = getData[i];
            characters[i]['name'] = DOMPurify.sanitize(characters[i]['name']);

            // For dropped-in cards
            if (!characters[i]['chat']) {
                characters[i]['chat'] = `${characters[i]['name']} - ${humanizedDateTime()}`;
            }

            characters[i]['chat'] = String(characters[i]['chat']);
        }
        if (this_chid != undefined && this_chid != 'invalid-safety-id') {
            $('#avatar_url_pole').val(characters[this_chid].avatar);
        }
        await printChars();
    }
}

function openPopup() {

    if (savedPopupContent) {
        console.log('Using saved popup content');
        // Append the saved content to the popup container
        callPopup('', 'text', '', { okButton: 'Close', wide: true, large: true })
            .then(() => {
                savedPopupContent = document.querySelector('.list-character-wrapper');
            });

        document.getElementById('dialogue_popup_text').appendChild(savedPopupContent);
        return;
    }

    const listLayout = popupState ? popupState : `
    <div class="list-character-wrapper" id="list-character-wrapper">
        <div id="character_tagmanager_template" class="template_element">
            <div class="character_select flex-container wide100p alignitemsflexstart" chid="" id="">
                <div class="avatar" title="">
                    <img src="">
                </div>
                <div class="flex-container wide100pLess70px character_select_container">
                    <div class="wide100p character_name_block">
                        <span class="ch_name"></span>
                        <small class="character_version"></small>
                        <small class="ch_avatar_url"></small>
                    </div>
                    <i class="ch_fav_icon fa-solid fa-star"></i>
                    <input class="ch_fav" value="" hidden />
                    <div class="ch_description"></div>
                    <div class="tags tags_inline"></div>
                </div>
            </div>
        </div>
        ${getChars()}
        <hr>
    </div>
    `;

    // Call the popup with our list layout
    callPopup(listLayout, 'text', '', { okButton: 'Close', wide: true, large: true })
        .then(() => {
            savedPopupContent = document.querySelector('.list-and-search-wrapper');
        });

}

jQuery(async () => {
    // put our button in between external_import_button and rm_button_group_chats in the form_character_search_form
    // on hover, should say "Open Tag Manager"
    $('#external_import_button').after('<button id="tag-manager" class="menu_button fa-solid fa-tags faSmallFontSquareFix" title="Open Tag Manager"></button>');
    $('#tag-manager').on('click', function () {
        openPopup();
    });

    loadSettings();
});
