// SillyTavernContext.ts
export class SillyTavernContext {
    private ctx: any;

    constructor() {
        this.ctx = SillyTavern.getContext();
    }

    // ---- data ----
    get never_resize_avatars(): boolean { return this.ctx.powerUserSettings.never_resize_avatars; }
    get tag_sort_mode(): string { return this.ctx.powerUserSettings.tag_sort_mode; }
    get characters(): any[] { return this.ctx.characters; }
    get tagMap(): Record<string, string[]> { return this.ctx.tagMap; }
    get tagList(): any[] { return this.ctx.tags; }
    get characterId(): number | undefined { return this.ctx.characterId; }
    get menuType(): string { return this.ctx.menuType; }
    get extensionSettings(): any { return this.ctx.extensionSettings; }
    get event_types(): any { return this.ctx.event_types; }
    get POPUP_TYPE(): any { return this.ctx.POPUP_TYPE; }
    get saveSettingsDebounced(): (...args: any[]) => void { return this.ctx.saveSettingsDebounced; }
    get eventSource(): any { return this.ctx.eventSource; }
    get slashCommand(): any { return this.ctx.SlashCommand; }
    get slashCommandParser(): any { return this.ctx.SlashCommandParser; }

    // ---- functions ----
    getCharacters(): Promise<any[]> {
        return this.ctx.getCharacters();
    }

    unshallowCharacter(char: any): Promise<any> {
        return this.ctx.unshallowCharacter(char);
    }

    selectCharacterById(id: number | string): void {
        return this.ctx.selectCharacterById(id);
    }

    getTokenCountAsync(...args: any[]): Promise<number> {
        return this.ctx.getTokenCountAsync(...args);
    }

    getThumbnailUrl(...args: any[]): string {
        return this.ctx.getThumbnailUrl(...args);
    }

    callGenericPopup(...args: any[]): Promise<any> {
        return this.ctx.callGenericPopup(...args);
    }

    renderExtensionTemplateAsync(...args: any[]): Promise<string> {
        return this.ctx.renderExtensionTemplateAsync(...args);
    }

    t(key: string, params?: Record<string, any>): string {
        return this.ctx.t(key, params);
    }

    substituteParams(...args: any[]): string {
        return this.ctx.substituteParams(...args);
    }

    getRequestHeaders(...args: any[]): Record<string, string> {
        return this.ctx.getRequestHeaders(...args);
    }
}
