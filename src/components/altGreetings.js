import { getTokenCountAsync, substituteParams } from "../constants/context.js";
import { saveAltGreetings } from "../services/altGreetings-service.js";

/**
 * Attaches an event listener to all elements with the class 'altGreeting_zone'.
 * The event listener triggers the saveAltGreetings function whenever an 'input' event occurs on the element.
 *
 * @return {void} This function does not return anything.
 */
export function addAltGreetingsTrigger(){
    document.querySelectorAll('.altGreeting_zone').forEach(textarea => {
        textarea.addEventListener('input', (event) => {saveAltGreetings(event);});
    });
}

/**
 * Adds a new alternate greeting section to the DOM within the 'altGreetings_content' container.
 * Each new section is dynamically created and appended to the container, including appropriate event listeners.
 *
 * @return {void} Does not return anything.
 */
export function addAltGreeting(){
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

/**
 * Deletes an alternative greeting block, updates the indices of remaining blocks,
 * and ensures proper UI display for the alternative greetings section.
 *
 * @param {number} index The index of the alternative greeting block to be deleted.
 * @param {Object} inlineDrawer The DOM element representing the alternative greeting block to remove.
 * @return {void} The function does not return a value.
 */
export function delAltGreeting(index, inlineDrawer){
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

/**
 * Generates and returns HTML content for alternative greetings based on the provided items.
 *
 * @param {string[]} item - An array of strings where each string represents a greeting.
 * @return {string} The generated HTML as a string. If the `item` array is empty, a placeholder HTML string is returned.
 */
export async function displayAltGreetings(item) {
    let altGreetingsHTML = '';

    if (!item || item.length === 0) {
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
                        <span class="tokens_count drawer-header-item">Tokens: ${await getTokenCountAsync(substituteParams(item[i]))}</span>
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
