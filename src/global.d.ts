// Global type declarations for the ACM extension

// SillyTavern global context
declare var SillyTavern: {
    getContext: () => any;
    libs: {
        Fuse: any;
        Popper: any;
    };
};

// Toastr
declare var toastr: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    warning: (msg: string) => void;
};

// jQuery plugin extensions
interface JQuery {
    transition(options: any): JQuery;
    autocomplete(options: any): JQuery;
    sortable(options: any): JQuery;
}

// Window extensions
interface Window {
    acmPoppers: {
        Export: any;
        UI: any;
        UISub: any;
        UIPreset: any;
    };
    acmIsUpdatingDetails: boolean;
}

// Ambient module declarations for external SillyTavern modules
declare module '/script.js' {
    export function setCharacterId(id: any): void;
    export function setMenuType(type: string): void;
    export const depth_prompt_depth_default: number;
    export const depth_prompt_role_default: string;
    export const talkativeness_default: number;
    export const system_message_types: any;
    export function getPastCharacterChats(): Promise<Array<{ file_name: string }>>;
}

declare module '/scripts/tags.js' {
    export function createTagMapFromList(selector: string, avatarId: string): void;
    export function createTagInput(inputSelector: string, listSelector: string, options?: any): void;
}

declare module '/scripts/utils.js' {
    export function ensureImageFormatSupported(file: File): Promise<File>;
    export function getCharaFilename(chara: any, options?: any): string;
    export function timestampToMoment(ts: any): any;
    export function sortMoments(a: any, b: any): number;
}

declare module '/scripts/group-chats.js' {
    export function renameGroupMember(oldAvatar: string, newAvatar: string, newName: string): Promise<void>;
}

declare module '/scripts/world-info.js' {
    export const world_info: any;
}
