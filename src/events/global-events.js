import { initializeCharDetailsEvents } from "./characterDetails-events.js";
import { initializeModalEvents } from "./modal-events.js";
import { initializeUIMenuEvents } from "./UImenu-events.js";
import { initializeCharactersEvents } from "./characters-events.js";
import { initializeToolbarEvents } from "./toolbar-events.js";
import { initializePresetsEvents } from "./presets-events.js";


/**
 * Initializes all event handlers for the extension
 */
export function initializeEventHandlers() {
    // Initialize event handlers for different components
    initializeCharDetailsEvents();
    initializeCharactersEvents();
    initializeModalEvents();
    initializeUIMenuEvents();
    initializeToolbarEvents();
    initializePresetsEvents();
}
