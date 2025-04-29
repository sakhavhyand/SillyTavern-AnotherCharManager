import { selectedChar } from "../constants/settings.js";
import { getTokenCountAsync, substituteParams } from "../constants/context.js";
import { editCharDebounced } from './characters-service.js';

/**
 * Collects the values of all textareas with the class 'altGreeting_zone'
 * and returns them as an array of strings.
 *
 * @return {string[]} An array containing the values of the textareas with the class 'altGreeting_zone'.
 */
function generateGreetingArray() {
    const textareas = document.querySelectorAll('.altGreeting_zone');
    const greetingArray = [];

    textareas.forEach(textarea => {
        greetingArray.push(textarea.value);
    });
    return greetingArray;
}

/**
 * Saves alternate greetings for the selected character and updates the relevant UI elements.
 *
 * @param {Event|null} event - The event object triggered by a user action, used to update token count.
 *                             Pass null if no event is available.
 * @return {void} This function does not return a value.
 */
export async function saveAltGreetings(event = null){
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
        tokensSpan.textContent = `Tokens: ${await getTokenCountAsync(substituteParams(textarea.value))}`;
    }

    // Edit the Alt Greetings number on the main drawer
    $('#altGreetings_number').html(`Numbers: ${greetings.length}`);
}
