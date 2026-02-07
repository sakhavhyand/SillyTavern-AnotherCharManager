// An extension that allows you to manage characters.
import { initializeTagInput} from './src/services/tags-service.js';
import { initializeSettings, migrateDropdownPresets } from "./src/services/settings-service.js";
import { initializeModal, openModal } from "./src/components/modal.js";
import { initializeEventHandlers } from "./src/events/global-events.js";
import { initializeCharacterModule } from "./src/services/imageLoader.js";
import { refreshCharListDebounced } from "./src/components/charactersList.js";
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';

jQuery(async () => {
    await initializeSettings();
    migrateDropdownPresets();
    await initializeModal();
    initializeEventHandlers();
    initializeTagInput();
    initializeCharacterModule();

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'another-char-manager',
        helpString: 'Open the Another Character Manager UI.',
        callback: () => {
            refreshCharListDebounced();
            openModal();
            return 'Opening Another Character Manager...';
        },
        returns: 'Opens the Another Character Manager modal window',
    }));
});
