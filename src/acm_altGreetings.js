import { getContext } from '../../../../extensions.js';
import { selectedChar, editCharDebounced } from '../index.js';

const getTokenCount = getContext().getTokenCount;
const substituteParams = getContext().substituteParams;

export { addAltGreetingsTrigger, addAltGreeting, delAltGreeting, displayAltGreetings };

// Function to generate an Array for the selected character alternative greetings
function generateGreetingArray() {
    const textareas = document.querySelectorAll('.altGreeting_zone');
    const greetingArray = [];

    textareas.forEach(textarea => {
        greetingArray.push(textarea.value);
    });
    return greetingArray;
}

// Add an event listeners to all alternative greetings text areas displayed
function addAltGreetingsTrigger(){
    document.querySelectorAll('.altGreeting_zone').forEach(textarea => {
        textarea.addEventListener('input', (event) => {saveAltGreetings(event);});
    });
}

// Function to display a new alternative greeting block
function addAltGreeting(){
    const drawerContainer = document.getElementById('altGreetings_content');

    // Determine the new greeting index
    const greetingIndex = drawerContainer.getElementsByClassName('inline-drawer').length + 1;

    // Create the new inline-drawer block
    const altGreetingDiv = document.createElement('div');
    altGreetingDiv.className = 'inline-drawer';
    altGreetingDiv.innerHTML = `<div id="altGreetDrawer${greetingIndex}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <div style="display: flex;flex-grow: 1;">
                        <strong class="drawer-header-item">
                            Greeting #
                            <span class="greeting_index">${greetingIndex}</span>
                        </strong>
                        <span class="tokens_count drawer-header-item">Tokens: 0</span>
                    </div>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight"></textarea>
                </div>
            </div>`;

    // Add the new inline-drawer block
    $('#chicken').empty();
    drawerContainer.appendChild(altGreetingDiv);

    // Add the event on the textarea
    altGreetingDiv.querySelector(`.altGreeting_zone`).addEventListener('input', (event) => {
        saveAltGreetings(event);
    });

    // Save it
    saveAltGreetings();
}

// Function to delete an alternative greetings block
function delAltGreeting(index, inlineDrawer){
    // Delete the AltGreeting block
    inlineDrawer.remove();

    // Update the others AltGreeting blocks
    const $altGreetingsToggle = $('.altgreetings-drawer-toggle');

    if ($('div[id^="altGreetDrawer"]').length === 0) {
        $('#altGreetings_content').html('<span id="chicken">Nothing here but chickens!!</span>');
    }
    else {
        $altGreetingsToggle.each(function() {
            const currentIndex = parseInt($(this).find('.greeting_index').text());
            if (currentIndex > index) {
                $(this).find('.greeting_index').text(currentIndex - 1);
                $(this).attr('id', `altGreetDrawer${currentIndex - 1}`);
            }
        });
    }

    // Save it
    saveAltGreetings();
}

// Function to Display the AltGreetings if they exists
function displayAltGreetings(item) {
    let altGreetingsHTML = '';

    if (item.length === 0) {
        return '<span id="chicken">Nothing here but chickens!!</span>';
    } else {
        for (let i = 0; i < item.length; i++) {
            let greetingNumber = i + 1;
            altGreetingsHTML += `<div class="inline-drawer">
                <div id="altGreetDrawer${greetingNumber}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <div style="display: flex;flex-grow: 1;">
                        <strong class="drawer-header-item">
                            Greeting #
                            <span class="greeting_index">${greetingNumber}</span>
                        </strong>
                        <span class="tokens_count drawer-header-item">Tokens: ${getTokenCount(substituteParams(item[i]))}</span>
                    </div>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight">${item[i]}</textarea>
                </div>
            </div>`;
        }
        return altGreetingsHTML;
    }
}

// Function to save added/edited/deleted alternative greetings
function saveAltGreetings(event = null){
    const greetings = generateGreetingArray();
    const update = {
        avatar: selectedChar,
        data: {
            alternate_greetings: greetings,
        },
    };
    editCharDebounced(update);
    // Update token count if necessary
    if (event) {
        const textarea = event.target;
        const tokensSpan = textarea.closest('.inline-drawer-content').previousElementSibling.querySelector('.tokens_count');
        tokensSpan.textContent = `Tokens: ${getTokenCount(substituteParams(textarea.value))}`;
    }

    // Edit the Alt Greetings number on the main drawer
    $('#altGreetings_number').html(`Numbers: ${greetings.length}`);
}
