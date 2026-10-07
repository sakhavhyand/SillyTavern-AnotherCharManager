export function setCharacterId(id: number | string | undefined): void;
export function setMenuType(type: string): void;
export const depth_prompt_depth_default: number;
export const depth_prompt_role_default: string;
export const talkativeness_default: number;
export const system_message_types: Record<string, string>;
export function getPastCharacterChats(characterId?: number | null): Promise<Array<{ file_name: string }>>;
