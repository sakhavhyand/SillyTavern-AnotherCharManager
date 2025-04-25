// An extension that allows you to manage characters.
import { initializeTagFilterStates } from './src/components/tags.js';
import { initializeSettings } from "./src/services/settings-service.js";
import { initializeModal } from "./src/components/modal.js";
import { initializeEventHandlers } from "./src/events/global-events.js";

jQuery(async () => {

    await initializeSettings();
    await initializeTagFilterStates();
    await initializeModal();
    initializeEventHandlers();

});
