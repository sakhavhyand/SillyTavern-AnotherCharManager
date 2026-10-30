import { deleteCharacter, setCharacterId, printCharactersDebounced } from '/script.js';
import { ensureImageFormatSupported } from '/scripts/utils.js';
import { renameGroupMember } from '/scripts/group-chats.js';
import { world_info } from '/scripts/world-info.js';
import {
    DEPTH_PROMPT_DEPTH_DEFAULT,
    DEPTH_PROMPT_ROLE_DEFAULT,
    NARRATOR_MESSAGE_TYPE,
    TALKATIVENESS_DEFAULT,
    getBase64Async,
    getCharaFilename,
    getIdByAvatar,
    updateTokenCount,
    debounce,
    delay,
    escapeHtml,
    getCardElement,
    getInvalidNameReason,
    mergeDeep,
    parseTagList,
    renderCreatorNotes,
    toYYYYMMDD,
} from '../acm-utils';


export class CharacterManager {
    eventManager: any;
    settings: any;
    st: any;
    tagManager: any;
    /** Avatar -> timestamp of its last replacement in this session. */
    avatarVersions: Map<string, number> = new Map();

    constructor(eventManager: any, settings: any, st: any, tagManager: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
        this.tagManager = tagManager;
    }

    init(): void {
        this.initializeCharactersEvents();
        this.initializeFieldUpdaters();
        this.checkLegacyAvatarPlugin();
    }

    /**
     * Tells the user the AvatarEdit server plugin is no longer needed, if it's still installed.
     */
    async checkLegacyAvatarPlugin(): Promise<void> {
        try {
            const response = await fetch('/api/plugins/avataredit/probe', { method: 'POST', headers: this.st.getRequestHeaders() });
            if (response.status === 204) {
                toastr.info(
                    'Avatar replacement now uses SillyTavern\'s built-in endpoint. The SillyTavern-AvatarEdit server plugin is no longer needed and can be safely removed.',
                    'AnotherCharManager',
                    { timeOut: 15000, extendedTimeOut: 5000 },
                );
            }
        } catch {
            // Plugin not reachable, nothing to report
        }
    }

    /** Unsaved edits, merged per avatar so edits to different fields never overwrite each other. */
    pendingEdits: Map<string, any> = new Map();
    /** Tail of the save chain, so saves reach the server in the order they were made. */
    private saveChain: Promise<void> = Promise.resolve();

    private flushEditsDebounced = debounce(() => { this.flushEdits(); }, 1000);

    /**
     * Queues a partial character update. Saved after 1s without new edits.
     */
    queueEdit(update: any): void {
        const avatar = update?.avatar;
        if (!avatar) return;
        this.pendingEdits.set(avatar, mergeDeep(this.pendingEdits.get(avatar) ?? {}, update));
        this.flushEditsDebounced();
    }

    /**
     * Saves all pending edits now. Resolves once they (and any earlier saves) are done.
     */
    flushEdits(): Promise<void> {
        const edits = [...this.pendingEdits.values()];
        this.pendingEdits.clear();
        for (const edit of edits) {
            this.saveChain = this.saveChain.then(() => this.editChar(edit)).catch(error => {
                console.error('Failed to save character changes:', error);
                toastr.error('Failed to save character changes.');
            });
        }
        return this.saveChain;
    }

    /**
     * Initializes a set of field updaters for designated DOM elements.
     */
    initializeFieldUpdaters(): void {
        const elementsToInitialize: Record<string, () => Promise<void> | void> = {
            '#acm_description': async () => { const descZone = $('#acm_description'); const update = { avatar: this.settings.selectedChar, description: String(descZone.val()), data: { description: String(descZone.val()) } }; this.queueEdit(update); await updateTokenCount('#acm_description'); },
            '#acm_firstMess': async () => { const firstMesZone = $('#acm_firstMess'); const update = { avatar: this.settings.selectedChar, first_mes: String(firstMesZone.val()), data: { first_mes: String(firstMesZone.val()) } }; this.queueEdit(update); await updateTokenCount('#acm_firstMess'); },
            '#acm_creator_notes_textarea': async () => {
                const creatorNotes = $('#acm_creator_notes_textarea');
                $('#acm_creatornotes_view').html(renderCreatorNotes(String(creatorNotes.val())));
                const update = {
                    avatar: this.settings.selectedChar,
                    creatorcomment: String(creatorNotes.val()),
                    data: { creator_notes: String(creatorNotes.val()) },
                };
                this.queueEdit(update);
                await updateTokenCount('#acm_creator_notes_textarea');
            },
            '#acm_character_version_textarea': () => { const update = { avatar: this.settings.selectedChar, data: { character_version: String($('#acm_character_version_textarea').val()) } }; this.queueEdit(update); },
            '#acm_system_prompt': async () => { const sysPrompt = $('#acm_system_prompt'); const update = { avatar: this.settings.selectedChar, data: { system_prompt: String(sysPrompt.val()) } }; this.queueEdit(update); await updateTokenCount('#acm_system_prompt'); },
            '#acm_post_history_prompt': async () => { const postHistory = $('#acm_post_history_prompt'); const update = { avatar: this.settings.selectedChar, data: { post_history_instructions: String(postHistory.val()) } }; this.queueEdit(update); await updateTokenCount('#acm_post_history_prompt'); },
            '#acm_creator_textarea': () => { const update = { avatar: this.settings.selectedChar, data: { creator: String($('#acm_creator_textarea').val()) } }; this.queueEdit(update); },
            '#acm_personality': async () => { const personality = $('#acm_personality'); const update = { avatar: this.settings.selectedChar, personality: String(personality.val()), data: { personality: String(personality.val()) } }; this.queueEdit(update); await updateTokenCount('#acm_personality'); },
            '#acm_scenario': async () => { const scenario = $('#acm_scenario'); const update = { avatar: this.settings.selectedChar, scenario: String(scenario.val()), data: { scenario: String(scenario.val()) } }; this.queueEdit(update); await updateTokenCount('#acm_scenario'); },
            '#acm_character_notes': async () => { const depthPrompt = $('#acm_character_notes'); const update = { avatar: this.settings.selectedChar, data: { extensions: { depth_prompt: { prompt: String(depthPrompt.val()) } } } }; this.queueEdit(update); await updateTokenCount('#acm_character_notes'); },
            '#acm_character_notes_depth': () => { const update = { avatar: this.settings.selectedChar, data: { extensions: { depth_prompt: { depth: $('#acm_character_notes_depth').val() } } } }; this.queueEdit(update); },
            '#acm_character_notes_role': () => { const update = { avatar: this.settings.selectedChar, data: { extensions: { depth_prompt: { role: String($('#acm_character_notes_role').val()) } } } }; this.queueEdit(update); },
            '#acm_talkativeness_slider': () => { const talkativeness = $('#acm_talkativeness_slider'); const update = { avatar: this.settings.selectedChar, talkativeness: String(talkativeness.val()), data: { extensions: { talkativeness: String(talkativeness.val()) } } }; this.queueEdit(update); },
            '#acm_mes_examples': async () => { const example = $('#acm_mes_examples'); const update = { avatar: this.settings.selectedChar, mes_example: String(example.val()), data: { mes_example: String(example.val()) } }; this.queueEdit(update); await updateTokenCount('#acm_mes_examples'); },
            '#acm_tags_textarea': () => { const tags = parseTagList(String($('#acm_tags_textarea').val())); const update = { avatar: this.settings.selectedChar, tags, data: { tags } }; this.queueEdit(update); },
        };

        Object.keys(elementsToInitialize).forEach(function (id) {
            $(id).on('input', elementsToInitialize[id]);
        });
    }

    /**
     * Initializes event listeners and functionality related to character operations.
     */
    initializeCharactersEvents(): void {
        // Add listener to refresh the display on characters edit
        this.st.eventSource.on(this.st.event_types.CHARACTER_EDITED, (data: any) => {
            if (data.detail && data.detail.avatarReplaced) {
                this.eventManager.emit('charList:refresh', true);
            }
        });
        // Add listener to refresh the display when a character is renamed
        this.st.eventSource.on(this.st.event_types.CHARACTER_RENAMED, () => {
            this.eventManager.emit('charList:refresh', true);
        });
        // Add listener to refresh the display on characters delete
        this.st.eventSource.on(this.st.event_types.CHARACTER_DELETED, (data: any) => {
            // Unsaved edits to a deleted character would fail to save
            if (data?.character?.avatar) this.pendingEdits.delete(data.character.avatar);

            const charDetailsState = document.getElementById('char-details');
            if (charDetailsState && charDetailsState.style.display !== 'none') {
                this.eventManager.emit('modal:closeDetails');
            }
            this.eventManager.emit('charList:refresh', true);
        });
        // Add listener to refresh the display on characters duplication
        this.st.eventSource.on(this.st.event_types.CHARACTER_DUPLICATED, () => {
            this.eventManager.emit('charList:refresh', true);
        });

        // Trigger when the favorites button is clicked
        $('#acm_favorite_button').on('click', () => this.toggleFavoriteStatus());

        // Export character
        $('#acm_export_button').on('click', function () {
            $('#acm_export_format_popup').toggle();
            window.acmPoppers.Export.update();
        });

        $(document).on('click', '.acm_export_format', (event: JQuery.TriggeredEvent) => {
            const format = $(event.currentTarget).data('format');
            if (format) {
                this.exportCharacter(format);
            }
        });

        // Duplicate character
        $('#acm_dupe_button').on('click', () => this.duplicateCharacter());

        // Delete character
        $('#acm_delete_button').on('click', () => this.deleteSelectedCharacter());

        // Edit a character avatar
        $('#edit_avatar_button').on('change', async (event: JQuery.TriggeredEvent) => {
            await this.update_avatar(event.currentTarget as HTMLInputElement);
        });

        // Rename character
        $('#acm_rename_button').on('click', () => this.renameCharacter());

        // Trigger when the Open Chat button is clicked
        $('#acm_open_chat').on('click', () => this.openCharacterChat());

        // Display Advanced Definitions popup
        $('#acm_advanced_div').on('click', () => this.toggleAdvancedDefinitionsPopup());

        $('#acm_character_cross').on('click', () => this.closeCharacterPopup());

        $(document).on('input', '.altGreeting_zone', (event: JQuery.TriggeredEvent) => {
            this.saveAltGreetings(event);
        });

        // Add a new alternative greetings
        $(document).on('click', '.fa-circle-plus, .acm-add-alt-greeting', async (event: JQuery.TriggeredEvent) => {
            event.stopPropagation();
            this.addAltGreeting();
        });

        // Delete an alternative greetings
        $(document).on('click', '.fa-circle-minus', (event: JQuery.TriggeredEvent) => {
            event.stopPropagation();
            const element = event.currentTarget;
            const inlineDrawer = (element as HTMLElement).closest('.inline-drawer');
            const greetingIndex = parseInt(((element as HTMLElement).closest('.altgreetings-drawer-toggle') as HTMLElement).querySelector('.greeting_index')!.textContent!);
            this.delAltGreeting(greetingIndex, inlineDrawer as HTMLElement);
        });

        const tagListObserver = new MutationObserver(() => {
            if (window.acmIsUpdatingDetails) return;
            this.eventManager.emit('charList:refresh', true);
        });

        const tagListElement = document.getElementById('tag_List');
        if (tagListElement) {
            tagListObserver.observe(tagListElement, { childList: true });
        }
    }

    /**
     * Fills the character details in the user interface based on the provided avatar.
     */
    async fillDetails(avatar: string): Promise<void> {
        if (typeof this.st.characters[getIdByAvatar(avatar)].data.alternate_greetings === 'undefined') {
            await this.st.unshallowCharacter(getIdByAvatar(avatar));
        }
        const char = this.st.characters[getIdByAvatar(avatar)];
        const avatarThumb = this.getAvatarThumbnailUrl(char.avatar);

        $('#avatar_title').attr('title', char.avatar);
        $('#avatar_img').attr('src', avatarThumb);
        $('#ch_name_details').text(char.name);
        $('#ch_infos_creator').text(`Creator: ${char.data.creator ? char.data.creator : (char.data.extensions.chub?.full_path?.split('/')[0] ?? ' - ')}`);
        $('#ch_infos_version').text(`Version: ${char.data.character_version ?? ' - '}`);
        const formattedDateString = toYYYYMMDD(char.create_date);
        $('#ch_infos_date').text(`Created: ${formattedDateString}`);
        $('#ch_infos_lastchat').text(`Last chat: ${char.date_last_chat ? new Date(char.date_last_chat).toISOString().substring(0, 10) : ' - '}`);
        $('#ch_infos_adddate').text(`Added: ${char.date_added ? new Date(char.date_added).toISOString().substring(0, 10) : ' - '}`);
        const chubPath = char.data.extensions.chub?.full_path;
        $('#ch_infos_link').html(chubPath ? `Link: <a href="https://chub.ai/${escapeHtml(chubPath)}" target="_blank" rel="noopener noreferrer">Chub</a>` : 'Link: -');
        const text = this.st.substituteParams(
            char.name +
            char.description +
            char.first_mes +
            (char.data?.extensions?.depth_prompt?.prompt ?? '') +
            (char.data?.post_history_instructions || '') +
            char.personality +
            char.scenario +
            (char.data?.extensions?.depth_prompt?.prompt ?? '') +
            char.mes_example,
        );
        const tokens = await this.st.getTokenCountAsync(text);
        $('#ch_infos_tok').text(`Tokens: ${tokens}`);
        const permText = this.st.substituteParams(
            char.name +
            char.description +
            char.personality +
            char.scenario +
            (char.data?.extensions?.depth_prompt?.prompt ?? ''),
        );
        const permTokens = await this.st.getTokenCountAsync(permText);
        $('#ch_infos_permtok').text(`Perm. Tokens: ${permTokens}`);
        const descTokens = await this.st.getTokenCountAsync(this.st.substituteParams(char.description));
        $('#acm_description_tokens').text(`Tokens: ${descTokens}`);
        $('#acm_tab_desc_tokens').text(`${descTokens} tokens`);
        $('#acm_description').val(char.description);

        const firstMessTokens = await this.st.getTokenCountAsync(this.st.substituteParams(char.first_mes));
        $('#acm_firstMess_tokens').text(`Tokens: ${firstMessTokens}`);
        $('#acm_tab_greeting_tokens').text(`${firstMessTokens} tokens`);
        $('#acm_firstMess').val(char.first_mes);

        const altGreetingsCount = char.data.alternate_greetings?.length ?? 0;
        $('#altGreetings_number').text(`Numbers: ${altGreetingsCount}`);
        $('#acm_tab_altgreetings_count').text(`${altGreetingsCount} greetings`);

        const creatorNotesVal = char.data?.creator_notes || char.creatorcomment || '';
        $('#acm_creatornotes_view').html(renderCreatorNotes(creatorNotesVal)).scrollTop(0);
        const creatorNotesTokens = await this.st.getTokenCountAsync(this.st.substituteParams(creatorNotesVal));
        $('#acm_tab_creatorsnotes_tokens').text(`${creatorNotesTokens} tokens`);

        const charTags = this.st.tagMap[char.avatar] || [];
        $('#tag_List').html(`${charTags.map((tag: string) => this.tagManager.displayTag(tag, 'details')).join('')}`);

        this.displayAltGreetings(char.data.alternate_greetings).then(html => {
            $('#altGreetings_content').html(html);
        });
        $('#acm_favorite_button').toggleClass('fav_on', char.fav || char.data.extensions.fav).toggleClass('fav_off', !(char.fav || char.data.extensions.fav));
    }

    /**
     * Populates various advanced character definition fields in the user interface.
     */
    async fillAdvancedDefinitions(avatar: string): Promise<void> {
        const char = this.st.characters[getIdByAvatar(avatar)];
        $('#acm_character_popup-button-h3').text(char.name);
        $('#acm_creator_notes_textarea').val(char.data?.creator_notes || char.creatorcomment);
        $('#acm_character_version_textarea').val(char.data?.character_version || '');
        $('#acm_system_prompt').val(char.data?.system_prompt || '');
        $('#acm_system_prompt_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.data?.system_prompt || ''))}`);
        $('#acm_post_history_prompt').val(char.data?.post_history_instructions || '');
        $('#acm_post_history_prompt_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.data?.post_history_instructions || ''))}`);
        $('#acm_tags_textarea').val(Array.isArray(char.data?.tags) ? char.data.tags.join(', ') : '');
        $('#acm_creator_textarea').val(char.data?.creator);
        $('#acm_personality').val(char.personality);
        $('#acm_personality_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.personality))}`);
        $('#acm_scenario').val(char.scenario);
        $('#acm_scenario_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.scenario))}`);
        $('#acm_character_notes').val(char.data?.extensions?.depth_prompt?.prompt ?? '');
        $('#acm_character_notes_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.data?.extensions?.depth_prompt?.prompt ?? ''))}`);
        $('#acm_character_notes_depth').val(char.data?.extensions?.depth_prompt?.depth ?? DEPTH_PROMPT_DEPTH_DEFAULT);
        $('#acm_character_notes_role').val(char.data?.extensions?.depth_prompt?.role ?? DEPTH_PROMPT_ROLE_DEFAULT);
        $('#acm_talkativeness_slider').val(char.talkativeness || TALKATIVENESS_DEFAULT);
        $('#acm_mes_examples').val(char.mes_example);
        $('#acm_mes_examples_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.mes_example))}`);
    }

    /**
     * Toggles the favorite status of the currently selected character.
     */
    toggleFavoriteStatus(): void {
        // Retrieve the ID of the currently selected character
        const id = getIdByAvatar(this.settings.selectedChar);
        // Determine the current favorite status, preferring a toggle that hasn't been saved yet
        const pendingFav = this.pendingEdits.get(this.settings.selectedChar)?.fav;
        const isFavorite = pendingFav ?? (this.st.characters[id].fav || this.st.characters[id].data.extensions.fav);
        // Prepare the updated data object with the toggled favorite status
        const update = {
            avatar: this.settings.selectedChar,
            fav: !isFavorite,
            data: {
                extensions: {
                    fav: !isFavorite,
                },
            },
        };
        this.queueEdit(update);
        // Get the favorite button element from the DOM
        const favoriteButton = $('#acm_favorite_button')[0];
        // Update the button's class to reflect the new favorite status
        if (isFavorite) {
            favoriteButton.classList.replace('fav_on', 'fav_off');
        } else {
            favoriteButton.classList.replace('fav_off', 'fav_on');
        }
    }

    /**
     * Toggles the visibility of the advanced definitions popup.
     */
    toggleAdvancedDefinitionsPopup(): void {
        const $popup = $('#acm_character_popup');
        if ($popup.css('display') === 'none') {
            $popup.css({ 'display': 'flex', 'opacity': 0.0 })
                .addClass('open')
                .transition({
                    opacity: 1.0,
                    duration: 125,
                    easing: 'ease-in-out',
                });
        } else {
            $popup.css('display', 'none').removeClass('open');
        }
    }

    /**
     * Closes the character popup in the user interface.
     */
    closeCharacterPopup(): void {
        $('#acm_character_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $('#acm_character_popup').css('display', 'none').removeClass('open');
        }, 125);
    }

    /**
     * Exports the currently selected character in the specified format.
     */
    async exportCharacter(format: string): Promise<void> {
        await this.flushEdits();
        const avatar = this.settings.selectedChar;
        const body = { format, avatar_url: avatar };

        const response = await fetch('/api/characters/export', {
            method: 'POST',
            headers: this.st.getRequestHeaders(),
            body: JSON.stringify(body),
        });

        if (response.ok) {
            const filename = avatar.replace('.png', `.${format}`);
            const blob = await response.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        $('#acm_export_format_popup').hide();
    }

    /**
     * Deletes the currently selected character, with the same confirmation as ST's delete button
     * (which can't be used: it deletes the active character).
     */
    async deleteSelectedCharacter(): Promise<void> {
        const avatar = this.settings.selectedChar;
        if (!avatar) return;

        let deleteChats = false;
        const confirmed = await this.st.callGenericPopup(
            `<h3>Delete the character?</h3>
            <b>THIS IS PERMANENT!<br><br>
            <label for="acm_del_char_checkbox" class="checkbox_label justifyCenter">
                <input type="checkbox" id="acm_del_char_checkbox" />
                <small>Also delete the chat files</small>
            </label></b>`,
            this.st.POPUP_TYPE.CONFIRM,
            '',
            { onClose: () => { deleteChats = !!$('#acm_del_char_checkbox').prop('checked'); } },
        );
        if (!confirmed) return;

        // ST's deleteCharacter() always closes the open chat. Only needed if it uses this character.
        const id = getIdByAvatar(avatar);
        const group = this.st.groupId ? this.st.groups.find((g: any) => g.id == this.st.groupId) : null;
        if (id === undefined || this.st.characterId === id || group?.members?.includes(avatar)) {
            // Pending edits are dropped by the CHARACTER_DELETED listener
            await deleteCharacter(avatar, { deleteChats });
        } else {
            await this.deleteInactiveCharacter(id, deleteChats);
        }
    }

    /**
     * Same as ST's deleteCharacter(), without closing the open chat.
     */
    async deleteInactiveCharacter(id: string, deleteChats: boolean): Promise<void> {
        const character = this.st.characters[id];
        const pastChats = deleteChats ? await this.st.getPastCharacterChats(character.avatar) : [];

        const response = await fetch('/api/characters/delete', {
            method: 'POST',
            headers: this.st.getRequestHeaders(),
            body: JSON.stringify({ avatar_url: character.avatar, delete_chats: deleteChats }),
            cache: 'no-cache',
        });

        if (!response.ok) {
            toastr.error(`Failed to delete character: ${response.status} ${response.statusText}`);
            return;
        }

        this.st.accountStorage.removeItem(`AlertWI_${character.avatar}`);
        this.st.accountStorage.removeItem(`AlertRegex_${character.avatar}`);
        this.st.accountStorage.removeItem(`mediaWarningShown:${character.avatar}`);
        delete this.st.tagMap[character.avatar];
        toastr.warning(`Character Deleted: ${character.name}`);

        for (const chat of pastChats) {
            await this.st.eventSource.emit(this.st.event_types.CHAT_DELETED, chat.file_name.replace('.jsonl', ''));
        }
        // Lets other extensions clean up (attachments, regex, quick replies...). Pending edits are dropped by our listener.
        await this.st.eventSource.emit(this.st.event_types.CHARACTER_DELETED, { id: Number(id), character });

        // Re-selects the active character by avatar, so its chat stays open
        await this.st.getCharacters();
        this.st.saveSettingsDebounced();
        this.eventManager.emit('charList:refresh', true);
    }

    /**
     * Renames the currently selected character.
     */
    async renameCharacter(): Promise<void> {
        // Pending edits are keyed by the old avatar, so save them before it changes
        await this.flushEdits();
        const oldAvatar = this.settings.selectedChar;
        const charID = getIdByAvatar(this.settings.selectedChar);
        const newName = await this.st.callGenericPopup('<h3>New name:</h3>', this.st.POPUP_TYPE.INPUT, this.st.characters[charID].name);
        if (newName && newName !== this.st.characters[charID].name) {
            // The server would silently strip or change these
            const invalidNameReason = getInvalidNameReason(String(newName));
            if (invalidNameReason) {
                toastr.warning(invalidNameReason, 'Invalid name');
                return;
            }
            const body = JSON.stringify({ avatar_url: oldAvatar, new_name: newName });
            const response = await fetch('/api/characters/rename', {
                method: 'POST',
                headers: this.st.getRequestHeaders(),
                body,
            });

            try {
                if (response.ok) {
                    const data = await response.json();
                    const newAvatar = data.avatar;
                    const oldName = getCharaFilename(oldAvatar);

                    // Replace tags list
                    this.tagManager.renameTagKey(oldAvatar, newAvatar);

                    // Additional lore books
                    const charLore = world_info.charLore?.find((x: any) => x.name == oldName);
                    if (charLore) {
                        charLore.name = newName;
                        this.st.saveSettingsDebounced();
                    }

                    // Char-bound Author's Notes
                    const charNote = this.st.extensionSettings.note.chara?.find((x: any) => x.name == oldName);
                    if (charNote) {
                        charNote.name = newName;
                        this.st.saveSettingsDebounced();
                    }

                    await this.st.eventSource.emit(this.st.event_types.CHARACTER_RENAMED, oldAvatar, newAvatar);

                    // getCharacters() re-selects the active character by its avatar, which no longer
                    // exists if it's the one renamed: unload it during the reload (as ST's rename does)
                    const activeId = this.st.characterId;
                    const renamingActive = activeId !== undefined && this.st.characters[activeId]?.avatar === oldAvatar;
                    if (renamingActive) setCharacterId(undefined);
                    // Reload characters list
                    await this.st.getCharacters();

                    // Find newly renamed character
                    const newChId = this.st.characters.findIndex((c: any) => c.avatar == data.avatar);

                    if (newChId !== -1) {
                        // Same as ST's rename: selecting it again reloads its chat under the new name
                        if (renamingActive) await this.st.selectCharacterById(newChId);
                        this.settings.setSelectedChar(newAvatar);
                        await this.fillDetails(newAvatar);

                        // Async delay to update UI
                        await delay(1);

                        // Also rename as a group member
                        await renameGroupMember(oldAvatar, newAvatar, newName);
                        const renamePastChatsConfirm = await this.st.callGenericPopup(`<h3>Character renamed!</h3>
                    <p>Past chats will still contain the old character name. Would you like to update the character name in previous chats as well?</p>
                    <i><b>Sprites folder (if any) should be renamed manually.</b></i>`, this.st.POPUP_TYPE.CONFIRM);

                        if (renamePastChatsConfirm) {
                            await this.renamePastChats(newAvatar, newName);
                            // The open chat still holds the old name in memory, and would write it back on its next save
                            if (renamingActive) await this.st.reloadCurrentChat();
                            toastr.success('Character renamed and past chats updated!');
                        }
                    }
                    else {
                        throw new Error('Newly renamed character was lost?');
                    }
                }
                else {
                    throw new Error('Could not rename the character');
                }
            }
            catch {
                // Reloading to prevent data corruption
                await this.st.callGenericPopup('Something went wrong. The page will be reloaded.', this.st.POPUP_TYPE.TEXT);
                location.reload();
            }
        }
    }

    /**
     * Opens the character chat interface for the currently selected character.
     */
    async openCharacterChat(): Promise<void> {
        // Save pending edits first so the chat loads the up-to-date character
        await this.flushEdits();
        await this.st.selectCharacterById(getIdByAvatar(this.settings.selectedChar));
        this.eventManager.emit('modal:close');
    }

    /**
     * Updates the avatar of the currently selected character.
     */
    async update_avatar(input: HTMLInputElement): Promise<void> {
        if (input.files && input.files[0]) {
            let crop_data: any = undefined;
            const file = input.files[0];
            const fileData = await getBase64Async(file);

            if (!this.st.never_resize_avatars) {
                // Display a cropping dialog to the user
                const dlg = await this.st.callGenericPopup('Set the crop position of the avatar image', this.st.POPUP_TYPE.CROP, '', { cropImage: fileData });

                if (!dlg) {
                    console.error('The popup object is invalid:', dlg);
                    return; // Exit if the user cancels the cropping dialog
                }
                crop_data = dlg.cropData;

                try {
                    // Replace the avatar with the cropped image
                    await this.replaceAvatar(file, getIdByAvatar(this.settings.selectedChar), crop_data);
                    this.refreshAvatarImages(this.settings.selectedChar);
                } catch {
                    toastr.error('Something went wrong.'); // Display an error message if the update fails
                }
            } else {
                try {
                    // Replace the avatar without cropping
                    await this.replaceAvatar(file, getIdByAvatar(this.settings.selectedChar));
                    this.refreshAvatarImages(this.settings.selectedChar);
                } catch {
                    toastr.error('Something went wrong.'); // Display an error message if the update fails
                }
            }
        }
    }

    /**
     * Returns the avatar thumbnail URL, with a cache-busting timestamp if the avatar
     * was replaced during this session. The browser reuses decoded images by URL,
     * so without it every re-render of the card would show the old picture again.
     */
    getAvatarThumbnailUrl(avatar: string): string {
        const url = this.st.getThumbnailUrl('avatar', avatar);
        const version = this.avatarVersions.get(avatar);
        return version ? `${url}&t=${version}` : url;
    }

    /**
     * Bumps the avatar's cache-busting version and updates the images currently displayed.
     */
    refreshAvatarImages(avatar: string): void {
        this.avatarVersions.set(avatar, Date.now());
        const newImageUrl = this.getAvatarThumbnailUrl(avatar);
        $('#avatar_img').attr('src', newImageUrl);
        getCardElement(avatar)?.querySelector('.card__media img')?.setAttribute('src', newImageUrl);
    }

    /**
     * Replaces a character's avatar with a new one, with optional cropping.
     */
    async replaceAvatar(newAvatar: File | string, id: string, crop_data: any = undefined): Promise<void> {
        // The server rewrites the PNG with its stored data, so save pending edits first
        await this.flushEdits();
        // Native ST endpoint (1.14.0+): keeps the card data, only swaps the image
        let url = '/api/characters/edit-avatar';

        if (crop_data !== undefined) {
            url += `?crop=${encodeURIComponent(JSON.stringify(crop_data))}`;
        }

        const avatar = this.st.characters[id].avatar;
        const formData = new FormData();
        if (newAvatar instanceof File) {
            const convertedFile = await ensureImageFormatSupported(newAvatar);
            formData.set('avatar', convertedFile);
        }

        formData.set('avatar_url', avatar);

        const response = await fetch(url, {
            method: 'POST',
            // Let the browser set the multipart boundary
            headers: this.st.getRequestHeaders({ omitContentType: true }),
            body: formData,
            cache: 'no-cache',
        });

        if (!response.ok) {
            toastr.error('Something went wrong while saving the character, or the image file provided was in an invalid format.');
            throw new Error(`Avatar replacement failed: ${response.status} ${await response.text()}`);
        }

        toastr.success('Avatar replaced successfully.');
        // Refresh the browser cache for the thumbnail and the full image
        await fetch(this.st.getThumbnailUrl('avatar', avatar), { method: 'GET', cache: 'reload' });
        await fetch(`/characters/${encodeURIComponent(avatar)}`, { method: 'GET', cache: 'reload' });
        await this.st.getCharacters();
        await this.st.eventSource.emit(this.st.event_types.CHARACTER_EDITED, { detail: { id: id, avatarReplaced: true, character: this.st.characters[id] } });
    }

    /**
     * Updates the attributes of a character by sending a POST request with the given data.
     */
    async editChar(update: any): Promise<void> {
        const url = '/api/characters/merge-attributes';

        const response = await fetch(url, {
            method: 'POST',
            headers: this.st.getRequestHeaders(),
            body: JSON.stringify(update),
            cache: 'no-cache',
        });

        if (response.ok) {
            // Reload only the edited character instead of the whole list (same as ST's /char-update)
            await this.st.getOneCharacter(update.avatar);
            // Keep ST's own character panel (names, favorites...) in sync; renders from memory, no request
            printCharactersDebounced();
            const id = Number(getIdByAvatar(update.avatar));
            await this.st.eventSource.emit(this.st.event_types.CHARACTER_EDITED, { detail: { id, character: this.st.characters[id] } });
        } else {
            toastr.error('Failed to save character changes.');
        }
    }

    /**
     * Duplicates the currently selected character.
     */
    async duplicateCharacter(): Promise<void> {
        if (!this.settings.selectedChar) {
            // Display a warning if no character is selected
            toastr.warning('You must first select a character to duplicate!');
            return;
        }
        // Show a confirmation dialog to the user
        const confirmMessage = `
        <h3>Are you sure you want to duplicate this character?</h3>
        <span>If you just want to start a new chat with the same character, use "Start new chat" option in the bottom-left options menu.</span><br><br>`;
        const confirmed = await this.st.callGenericPopup(confirmMessage, this.st.POPUP_TYPE.CONFIRM);
        if (!confirmed) {
            // Log a message if the user cancels the duplication
            console.log('User cancelled duplication');
            return;
        }
        // Duplicate the selected character, including any unsaved edits
        await this.flushEdits();
        const body = { avatar_url: this.settings.selectedChar };
        const response = await fetch('/api/characters/duplicate', {
            method: 'POST',
            headers: this.st.getRequestHeaders(),
            body: JSON.stringify(body),
        });

        if (response.ok) {
            toastr.success('Character Duplicated');
            const data = await response.json();
            await this.st.eventSource.emit(this.st.event_types.CHARACTER_DUPLICATED, { oldAvatar: body.avatar_url, newAvatar: data.path });
            await this.st.getCharacters();
        }
    }

    /**
     * Renames past chats and updates their associated avatar and chat name.
     */
    async renamePastChats(newAvatar: string, newValue: string): Promise<void> {
        const pastChats = await this.st.getPastCharacterChats(newAvatar);

        for (const { file_name } of pastChats) {
            try {
                const fileNameWithoutExtension = file_name.replace('.jsonl', '');
                const getChatResponse = await fetch('/api/chats/get', {
                    method: 'POST',
                    headers: this.st.getRequestHeaders(),
                    body: JSON.stringify({
                        ch_name: newValue,
                        file_name: fileNameWithoutExtension,
                        avatar_url: newAvatar,
                    }),
                    cache: 'no-cache',
                });

                if (getChatResponse.ok) {
                    const currentChat = await getChatResponse.json();
                    for (const message of currentChat) {
                        if (message.is_user || message.is_system || message.extra?.type == NARRATOR_MESSAGE_TYPE) {
                            continue;
                        }
                        if (message.name !== undefined) {
                            message.name = newValue;
                        }
                    }

                    const saveChatResponse = await fetch('/api/chats/save', {
                        method: 'POST',
                        headers: this.st.getRequestHeaders(),
                        body: JSON.stringify({
                            ch_name: newValue,
                            file_name: fileNameWithoutExtension,
                            chat: currentChat,
                            avatar_url: newAvatar,
                        }),
                        cache: 'no-cache',
                    });

                    if (!saveChatResponse.ok) {
                        throw new Error('Could not save chat');
                    }
                }
            } catch (error) {
                toastr.error(`Past chat could not be updated: ${file_name}`);
                console.error(error);
            }
        }
    }

    /**
     * Generates and returns HTML content for alternative greetings.
     */
    async displayAltGreetings(item: string[]): Promise<string> {
        let altGreetingsHTML = '';
        if (!item || item.length === 0) {
            return '<span id="chicken">Nothing here but chickens!!</span>';
        } else {
            for (let i = 0; i < item.length; i++) {
                const greetingNumber = i + 1;
                altGreetingsHTML += `<div class="inline-drawer">
                <div id="altGreetDrawer${greetingNumber}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <div style="display: flex;flex-grow: 1;">
                        <strong class="drawer-header-item">
                            Greeting #
                            <span class="greeting_index">${greetingNumber}</span>
                        </strong>
                        <span class="tokens_count drawer-header-item">Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(item[i]))}</span>
                    </div>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight">${escapeHtml(item[i])}</textarea>
                </div>
            </div>`;
            }
            return altGreetingsHTML;
        }
    }

    /**
     * Adds a new alternate greeting section to the DOM.
     */
    addAltGreeting(): void {
        const tabButton = $('#acm-desc-tab-bar .acm-tab-button[data-acm-tab="altgreetings"]');
        if (tabButton.length && !tabButton.hasClass('active')) {
            tabButton.trigger('click');
        }

        const drawerContainer = document.getElementById('altGreetings_content');
        if (!drawerContainer) return;
        // Determine the new greeting index
        const greetingIndex = drawerContainer.getElementsByClassName('inline-drawer').length + 1;
        // Create the new inline-drawer block
        const altGreetingDiv = document.createElement('div');
        altGreetingDiv.className = 'inline-drawer';
        altGreetingDiv.innerHTML = `<div id="altGreetDrawer${greetingIndex}" class="altgreetings-drawer-toggle inline-drawer-header inline-drawer-design">
                    <div style="display: flex;flex-grow: 1;">
                        <strong class="drawer-header-item">
                            Greeting #
                            <span class="greeting_index">${greetingIndex}</span>
                        </strong>
                        <span class="tokens_count drawer-header-item">Tokens: 0</span>
                    </div>
                    <div class="altGreetings_buttons">
                        <i class="inline-drawer-icon fa-solid fa-circle-minus"></i>
                        <i class="inline-drawer-icon idit fa-solid fa-circle-chevron-down down"></i>
                    </div>
                </div>
                <div class="inline-drawer-content">
                    <textarea class="altGreeting_zone autoSetHeight"></textarea>
                </div>
            </div>`;
        // Add the new inline-drawer block
        $('#chicken').empty();
        // Typing in it is handled by the delegated '.altGreeting_zone' input listener
        drawerContainer.appendChild(altGreetingDiv);
        // Save it
        this.saveAltGreetings();
    }

    /**
     * Deletes an alternative greeting block.
     */
    delAltGreeting(index: number, inlineDrawer: HTMLElement): void {
        // Delete the AltGreeting block
        inlineDrawer.remove();
        // Update the others AltGreeting blocks
        const $altGreetingsToggle = $('.altgreetings-drawer-toggle');
        if ($('div[id^="altGreetDrawer"]').length === 0) {
            $('#altGreetings_content').html('<span id="chicken">Nothing here but chickens!!</span>');
        }
        else {
            $altGreetingsToggle.each(function (this: HTMLElement) {
                const currentIndex = parseInt($(this).find('.greeting_index').text()!);
                if (currentIndex > index) {
                    $(this).find('.greeting_index').text(currentIndex - 1);
                    $(this).attr('id', `altGreetDrawer${currentIndex - 1}`);
                }
            });
        }
        // Save it
        this.saveAltGreetings();
    }

    /**
     * Collects the values of all textareas with the class 'altGreeting_zone'.
     */
    generateGreetingArray(): string[] {
        const textareas = document.querySelectorAll<HTMLTextAreaElement>('.altGreeting_zone');
        const greetingArray: string[] = [];

        textareas.forEach(textarea => {
            greetingArray.push(textarea.value);
        });
        return greetingArray;
    }

    /**
     * Saves alternate greetings for the selected character.
     */
    async saveAltGreetings(event: JQuery.TriggeredEvent | null = null): Promise<void> {
        const greetings = this.generateGreetingArray();
        const update = {
            avatar: this.settings.selectedChar,
            data: {
                alternate_greetings: greetings,
            },
        };
        this.queueEdit(update);

        // Update token count if necessary
        if (event) {
            const textarea = event.target as HTMLTextAreaElement;
            const tokensSpan = textarea.closest('.inline-drawer-content')!.previousElementSibling!.querySelector('.tokens_count');
            if (tokensSpan) {
                tokensSpan.textContent = `Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(textarea.value))}`;
            }
        }

        // Edit the Alt Greetings number on the main drawer and tab
        $('#altGreetings_number').html(`Numbers: ${greetings.length}`);
        $('#acm_tab_altgreetings_count').text(`${greetings.length} greetings`);
    }
}
