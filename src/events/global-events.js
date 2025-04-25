import { initializeCharDetailsEvents } from "./characterDetails-events.js";
import { initializeModalEvents } from "./modal-events.js";


/**
 * Initializes all event handlers for the extension
 */
export function initializeEventHandlers() {
    // Initialize event handlers for different components
    initializeCharDetailsEvents();
    initializeModalEvents();
}
