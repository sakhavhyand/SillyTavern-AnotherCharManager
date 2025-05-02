import { initializeModalEvents, initializeUIMenuEvents } from "./modal-events.js";
import { initializeCharactersEvents } from "./characters-events.js";
import { initializePresetsEvents } from "./presets-events.js";
import { initializeCharactersListEvents, initializeToolbarEvents } from "./charactersList-events.js";
import { initializeCharacterCreationEvents } from "./characterCreation-events.js";


/**
 * Initializes all event handlers for the extension
 */
export function initializeEventHandlers() {
    // Initialize event handlers for different components
    initializeModalEvents();
    initializeToolbarEvents();
    initializeUIMenuEvents();
    initializePresetsEvents();
    initializeCharacterCreationEvents();
    initializeCharactersListEvents();
    initializeCharactersEvents();
}
