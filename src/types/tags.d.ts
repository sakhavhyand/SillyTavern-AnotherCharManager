export function createTagMapFromList(selector: string, avatarId: string): void;
export function createTagInput(inputSelector: string, listSelector: string, options?: Record<string, unknown>): void;
export function removeTagFromEntity(tag: any, entityId: string | string[], options?: { tagListSelector?: string | null; tagElement?: JQuery<HTMLElement> | null }): boolean;
export function applyCharacterTagsToMessageDivs(options?: { mesIds?: number[] }): void;
