export function setCharacterId(id: number | string | undefined): void;
export function setMenuType(type: string): void;
export const printCharactersDebounced: () => void;
export let converter: { makeHtml(text: string): string };
export function deleteCharacter(characterKey: string | string[], options?: { deleteChats?: boolean }): Promise<boolean>;
