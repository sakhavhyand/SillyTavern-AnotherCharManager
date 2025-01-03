import { refreshCharList, tagFilterstates } from '../index.js';

const getContext = SillyTavern.getContext;
const tagList = getContext().tags;
const tag_map = getContext().tagMap;
const saveSettingsDebounced = getContext().saveSettingsDebounced;

export { displayTag, generateTagFilter, tagFilterClick, addListenersTagFilter, renameTagKey };


// Function to generate the HTML for displaying a tag
function displayTag( tagId, removable = true ){
    const tagClass = removable ? "fa-solid fa-circle-xmark tag_remove" : "fa-solid fa-circle-xmark";
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
