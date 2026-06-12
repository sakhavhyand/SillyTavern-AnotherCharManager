// Default settings for the extension
export const EXTENSION_NAME = 'SillyTavern-AnotherCharManager';
export const OLD_EXTENSION_NAME = 'SillyTavern-AnotherTagManager';

export interface DropdownOpenSections {
    allTags: string[];
    custom: string[];
    creators: string[];
}

export interface DropdownPreset {
    name: string;
    categories: string[];
}

export interface ExtensionSettings {
    popupWidth: number;
    sortingField: string;
    sortingOrder: 'asc' | 'desc';
    favOnly: boolean;
    dropdownUI: boolean;
    dropdownMode: string;
    dropdownOpenSections: DropdownOpenSections;
    presetId: number;
    dropdownPresets: DropdownPreset[];
}

export interface CreateData {
    name: string;
    description: string;
    creator_notes: string;
    post_history_instructions: string;
    character_version: string;
    system_prompt: string;
    tags: string;
    creator: string;
    personality: string;
    first_message: string;
    avatar: null;
    scenario: string;
    mes_example: string;
    world: string;
    talkativeness: number;
    alternate_greetings: string[];
    depth_prompt_prompt: string;
    depth_prompt_depth: number;
    depth_prompt_role: string;
    extensions: Record<string, unknown>;
    extra_books: string[];
}

export const defaultSettings: Readonly<ExtensionSettings> = Object.freeze({
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

export const create_data: Readonly<CreateData> = Object.freeze({
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

