// Default settings for the extension
export const EXTENSION_NAME = 'SillyTavern-AnotherCharManager';
export const OLD_EXTENSION_NAME = 'SillyTavern-AnotherTagManager';

export const defaultSettings = Object.freeze({
    popupWidth: 50,
    sortingField: 'name',
    sortingOrder: 'asc',
    favOnly: false,
    dropdownUI: false,
    dropdownMode: 'allTags',
    dropdownOpenSections: {
        allTags: [],
        custom: [],
        creators: []
    },
    presetId: 0,
    dropdownPresets: [
        { name: 'Preset 1', categories: [] },
        { name: 'Preset 2', categories: [] },
        { name: 'Preset 3', categories: [] },
        { name: 'Preset 4', categories: [] },
        { name: 'Preset 5', categories: [] },
    ],
});

export const create_data = Object.freeze({
    name: '',
    description: '',
    creator_notes: '',
    post_history_instructions: '',
    character_version: '',
    system_prompt: '',
    tags: '',
    creator: '',
    personality: '',
    first_message: '',
    avatar: null,
    scenario: '',
    mes_example: '',
    world: '',
    talkativeness: 0.5,
    alternate_greetings: [],
    depth_prompt_prompt: '',
    depth_prompt_depth: 4,
    depth_prompt_role: 'system',
    extensions: {},
    extra_books: [],
});

