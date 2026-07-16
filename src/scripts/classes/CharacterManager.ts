// @ts-ignore - External SillyTavern module, resolved by webpack externals
import { depth_prompt_depth_default, depth_prompt_role_default, setCharacterId, talkativeness_default, getPastCharacterChats, system_message_types } from '/script.js';
// @ts-ignore - External SillyTavern module, resolved by webpack externals
import { ensureImageFormatSupported, getCharaFilename } from '/scripts/utils.js';
// @ts-ignore - External SillyTavern module, resolved by webpack externals
import { renameGroupMember } from '/scripts/group-chats.js';
// @ts-ignore - External SillyTavern module, resolved by webpack externals
import { world_info } from '/scripts/world-info.js';
import {
    getBase64Async,
    getIdByAvatar,
    updateTokenCount,
    debounce,
    delay,
    toYYYYMMDD,
} from '../acm-utils';


export class CharacterManager {
    eventManager: any;
    settings: any;
    st: any;
    tagManager: any;

    constructor(eventManager: any, settings: any, st: any, tagManager: any) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
        this.tagManager = tagManager;
    }

    init(): void {
        this.initializeCharactersEvents();
        this.initializeFieldUpdaters();
    }

    // Create a debounced version of editChar
    editCharDebounced = debounce((data: any) => { this.editChar(data); }, 1000);

    /**
     * Initializes a set of field updaters for designated DOM elements.
     */
    initializeFieldUpdaters(): void {
        const elementsToInitialize: Record<string, () => Promise<void> | void> = {
            '#acm_description': async () => { const descZone = $('#acm_description'); const update = { avatar: this.settings.selectedChar, description: String(descZone.val()), data: { description: String(descZone.val()) } }; this.editCharDebounced(update); await updateTokenCount('#acm_description'); },
            '#acm_firstMess': async () => { const firstMesZone = $('#acm_firstMess'); const update = { avatar: this.settings.selectedChar, first_mes: String(firstMesZone.val()), data: { first_mes: String(firstMesZone.val()) } }; this.editCharDebounced(update); await updateTokenCount('#acm_firstMess'); },
            '#acm_creatornotes': () => {
                const creatorNotes = $('#acm_creatornotes');
                $('#acm_creator_notes_textarea').val(String(creatorNotes.val()));
                const update = {
                    avatar: this.settings.selectedChar,
                    creatorcomment: String(creatorNotes.val()),
                    data: { creator_notes: String(creatorNotes.val()) },
                };
                this.editCharDebounced(update);
            },
            '#acm_creator_notes_textarea': () => {
                const creatorNotes = $('#acm_creator_notes_textarea');
                $('#acm_creatornotes').val(String(creatorNotes.val()));
                const update = {
                    avatar: this.settings.selectedChar,
                    creatorcomment: String(creatorNotes.val()),
                    data: { creator_notes: String(creatorNotes.val()) },
                };
                this.editCharDebounced(update);
            },
            '#acm_character_version_textarea': () => { const update = { avatar: this.settings.selectedChar, data: { character_version: String($('#acm_character_version_textarea').val()) } }; this.editCharDebounced(update); },
            '#acm_system_prompt': async () => { const sysPrompt = $('#acm_system_prompt'); const update = { avatar: this.settings.selectedChar, data: { system_prompt: String(sysPrompt.val()) } }; this.editCharDebounced(update); await updateTokenCount('#acm_system_prompt'); },
            '#acm_post_history_prompt': async () => { const postHistory = $('#acm_post_history_prompt'); const update = { avatar: this.settings.selectedChar, data: { post_history_instructions: String(postHistory.val()) } }; this.editCharDebounced(update); await updateTokenCount('#acm_post_history_prompt'); },
            '#acm_creator_textarea': () => { const update = { avatar: this.settings.selectedChar, data: { creator: String($('#acm_creator_textarea').val()) } }; this.editCharDebounced(update); },
            '#acm_personality': async () => { const personality = $('#acm_personality'); const update = { avatar: this.settings.selectedChar, personality: String(personality.val()), data: { personality: String(personality.val()) } }; this.editCharDebounced(update); await updateTokenCount('#acm_personality'); },
            '#acm_scenario': async () => { const scenario = $('#acm_scenario'); const update = { avatar: this.settings.selectedChar, scenario: String(scenario.val()), data: { scenario: String(scenario.val()) } }; this.editCharDebounced(update); await updateTokenCount('#acm_scenario'); },
            '#acm_character_notes': async () => { const depthPrompt = $('#acm_character_notes'); const update = { avatar: this.settings.selectedChar, data: { extensions: { depth_prompt: { prompt: String(depthPrompt.val()) } } } }; this.editCharDebounced(update); await updateTokenCount('#acm_character_notes'); },
            '#acm_character_notes_depth': () => { const update = { avatar: this.settings.selectedChar, data: { extensions: { depth_prompt: { depth: $('#acm_character_notes_depth').val() } } } }; this.editCharDebounced(update); },
            '#acm_character_notes_role': () => { const update = { avatar: this.settings.selectedChar, data: { extensions: { depth_prompt: { role: String($('#acm_character_notes_role').val()) } } } }; this.editCharDebounced(update); },
            '#acm_talkativeness_slider': () => { const talkativeness = $('#acm_talkativeness_slider'); const update = { avatar: this.settings.selectedChar, talkativeness: String(talkativeness.val()), data: { extensions: { talkativeness: String(talkativeness.val()) } } }; this.editCharDebounced(update); },
            '#acm_mes_examples': async () => { const example = $('#acm_mes_examples'); const update = { avatar: this.settings.selectedChar, mes_example: String(example.val()), data: { mes_example: String(example.val()) } }; this.editCharDebounced(update); await updateTokenCount('#acm_mes_examples'); },
            '#acm_tags_textarea': () => { const tagZone = $('#acm_tags_textarea'); const val = String(tagZone.val()); const update = { avatar: this.settings.selectedChar, tags: val.split(', '), data: { tags: val.split(', ') } }; this.editCharDebounced(update); },
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
        this.st.eventSource.on(this.st.event_types.CHARACTER_DELETED, () => {
            let charDetailsState = document.getElementById('char-details');
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
        $('#acm_delete_button').on('click', function () {
            $('#delete_button').trigger('click');
        });

        // Edit a character avatar
        $('#edit_avatar_button').on('change', async (event: JQuery.TriggeredEvent) => {
            const isAvailable = await this.checkApiAvailability();
            if (isAvailable) {
                await this.update_avatar(event.currentTarget as HTMLInputElement);
            } else {
                toastr.warning('Please check if the needed plugin is installed! Link in the README.');
            }
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
        $(document).on('click', '.fa-circle-plus', async (event: JQuery.TriggeredEvent) => {
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
     * Checks the availability of the AvatarEdit API.
     */
    async checkApiAvailability(): Promise<boolean> {
        try {
            const response = await fetch('/api/plugins/avataredit/probe', { method: 'POST', headers: this.st.getRequestHeaders() });
            return response.status === 204;
        } catch (err) {
            console.error('Error checking API availability:', err);
            return false;
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
        const avatarThumb = this.st.getThumbnailUrl('avatar', char.avatar);

        $('#avatar_title').attr('title', char.avatar);
        $('#avatar_img').attr('src', avatarThumb);
        $('#ch_name_details').text(char.name);
        $('#ch_infos_creator').text(`Creator: ${char.data.creator ? char.data.creator : (char.data.extensions.chub?.full_path?.split('/')[0] ?? ' - ')}`);
        $('#ch_infos_version').text(`Version: ${char.data.character_version ?? ' - '}`);
        const formattedDateString = toYYYYMMDD(char.create_date);
        $('#ch_infos_date').text(`Created: ${formattedDateString}`);
        $('#ch_infos_lastchat').text(`Last chat: ${char.date_last_chat ? new Date(char.date_last_chat).toISOString().substring(0, 10) : ' - '}`);
        $('#ch_infos_adddate').text(`Added: ${char.date_added ? new Date(char.date_added).toISOString().substring(0, 10) : ' - '}`);
        $('#ch_infos_link').html(char.data.extensions.chub?.full_path ? `Link: <a href="https://chub.ai/${char.data.extensions.chub.full_path}" target="_blank">Chub</a>` : 'Link: -');
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
        $('#acm_description_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.description))}`);
        $('#acm_description').val(char.description);
        $('#acm_firstMess_tokens').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.first_mes))}`);
        $('#acm_firstMess').val(char.first_mes);
        $('#altGreetings_number').text(`Numbers: ${char.data.alternate_greetings?.length ?? 0}`);
        $('#acm_creatornotes').val(char.data?.creator_notes || char.creatorcomment);

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
        $('#acm_character_notes_depth').val(char.data?.extensions?.depth_prompt?.depth ?? depth_prompt_depth_default);
        $('#acm_character_notes_role').val(char.data?.extensions?.depth_prompt?.role ?? depth_prompt_role_default);
        $('#acm_talkativeness_slider').val(char.talkativeness || talkativeness_default);
        $('#acm_mes_examples').val(char.mes_example);
        $('#acm_messages_examples').text(`Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(char.mes_example))}`);
    }

    /**
     * Toggles the favorite status of the currently selected character.
     */
    toggleFavoriteStatus(): void {
        // Retrieve the ID of the currently selected character
        const id = getIdByAvatar(this.settings.selectedChar);
        // Determine the current favorite status of the character
        const isFavorite = this.st.characters[id].fav || this.st.characters[id].data.extensions.fav;
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
        // Apply the update using a debounced function to avoid excessive updates
        this.editCharDebounced(update);
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
        $('#character_popup').transition({
            opacity: 0,
            duration: 125,
            easing: 'ease-in-out',
        });
        setTimeout(function () {
            $('#acm_character_popup').css('display', 'none');
        }, 125);
    }

    /**
     * Exports the currently selected character in the specified format.
     */
    async exportCharacter(format: string): Promise<void> {
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
     * Renames the currently selected character.
     */
    async renameCharacter(): Promise<void> {
        const oldAvatar = this.settings.selectedChar;
        const charID = getIdByAvatar(this.settings.selectedChar);
        const newName = await this.st.callGenericPopup('<h3>New name:</h3>', this.st.POPUP_TYPE.INPUT, this.st.characters[charID].name);
        if (newName && newName !== this.st.characters[charID].name) {
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
                    const oldName = getCharaFilename(null, { manualAvatarKey: oldAvatar });

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

                    // Unload current character
                    setCharacterId(undefined);
                    // Reload characters list
                    await this.st.getCharacters();

                    // Find newly renamed character
                    const newChId = this.st.characters.findIndex((c: any) => c.avatar == data.avatar);

                    if (newChId !== -1) {
                        // Select the character after the renaming
                        setCharacterId(newChId);
                        this.settings.setSelectedChar(newAvatar);

                        // Async delay to update UI
                        await delay(1);

                        if (this.st.characterId === -1) {
                            throw new Error('New character not selected');
                        }

                        // Also rename as a group member
                        await renameGroupMember(oldAvatar, newAvatar, newName);
                        const renamePastChatsConfirm = await this.st.callGenericPopup(`<h3>Character renamed!</h3>
                    <p>Past chats will still contain the old character name. Would you like to update the character name in previous chats as well?</p>
                    <i><b>Sprites folder (if any) should be renamed manually.</b></i>`, this.st.POPUP_TYPE.CONFIRM);

                        if (renamePastChatsConfirm) {
                            await this.renamePastChats(newAvatar, newName);
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
    openCharacterChat(): void {
        setCharacterId(undefined);
        this.settings.setMem_avatar(undefined);
        this.st.selectCharacterById(getIdByAvatar(this.settings.selectedChar));
        this.eventManager.emit('modal:closeDetails', false);
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
                    // Update the avatar image in the UI with a cache-busting timestamp
                    const newImageUrl = this.st.getThumbnailUrl('avatar', this.settings.selectedChar) + '&t=' + new Date().getTime();
                    $('#avatar_img').attr('src', newImageUrl);
                    $(`[data-avatar="${this.settings.selectedChar}"]`).attr('src', newImageUrl);
                } catch {
                    toastr.error('Something went wrong.'); // Display an error message if the update fails
                }
            } else {
                try {
                    // Replace the avatar without cropping
                    await this.replaceAvatar(file, getIdByAvatar(this.settings.selectedChar));
                    // Update the avatar image in the UI with a cache-busting timestamp
                    const newImageUrl = this.st.getThumbnailUrl('avatar', this.settings.selectedChar) + '&t=' + new Date().getTime();
                    $('#avatar_img').attr('src', newImageUrl);
                    $(`[data-avatar="${this.settings.selectedChar}"]`).attr('src', newImageUrl);
                } catch {
                    toastr.error('Something went wrong.'); // Display an error message if the update fails
                }
            }
        }
    }

    /**
     * Replaces a character's avatar with a new one, with optional cropping.
     */
    async replaceAvatar(newAvatar: File | string, id: string, crop_data: any = undefined): Promise<void> {
        let url = '/api/plugins/avataredit/edit-avatar';

        if (crop_data !== undefined) {
            url += `?crop=${encodeURIComponent(JSON.stringify(crop_data))}`;
        }

        let formData = new FormData();
        if (newAvatar instanceof File) {
            const convertedFile = await ensureImageFormatSupported(newAvatar);
            formData.set('avatar', convertedFile);
        }

        formData.set('avatar_url', this.st.characters[id].avatar);

        return new Promise((resolve, reject) => {
            jQuery.ajax({
                type: 'POST',
                url: url,
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success: async () => {
                    toastr.success('Avatar replaced successfully.');
                    await fetch(this.st.getThumbnailUrl('avatar', formData.get('avatar_url') as string), {
                        method: 'GET',
                        cache: 'no-cache',
                        headers: {
                            'pragma': 'no-cache',
                            'cache-control': 'no-cache',
                        },
                    });
                    await this.st.getCharacters();
                    await this.st.eventSource.emit(this.st.event_types.CHARACTER_EDITED, { detail: { id: id, avatarReplaced: true, character: this.st.characters[id] } });
                    resolve();
                },
                error: function (jqXHR: any, exception: any) {
                    toastr.error('Something went wrong while saving the character, or the image file provided was in an invalid format. Double check that the image is not a webp.');
                    reject();
                },
            });
        });
    }

    /**
     * Updates the attributes of a character by sending a POST request with the given data.
     */
    async editChar(update: any): Promise<void> {
        let url = '/api/characters/merge-attributes';

        const response = await fetch(url, {
            method: 'POST',
            headers: this.st.getRequestHeaders(),
            body: JSON.stringify(update),
            cache: 'no-cache',
        });

        if (response.ok) {
            await this.st.getCharacters();
            await this.st.eventSource.emit(this.st.event_types.CHARACTER_EDITED, { detail: { id: this.st.characterId, character: this.st.characters[this.st.characterId] } });
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
        // Duplicate the selected character
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
        const pastChats = await getPastCharacterChats();

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
                        if (message.is_user || message.is_system || message.extra?.type == system_message_types.NARRATOR) {
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
                let greetingNumber = i + 1;
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
                    <textarea class="altGreeting_zone autoSetHeight">${item[i]}</textarea>
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
        drawerContainer.appendChild(altGreetingDiv);
        // Add the event on the textarea
        const textarea = altGreetingDiv.querySelector('.altGreeting_zone');
        if (textarea) {
            textarea.addEventListener('input', (event) => {
                this.saveAltGreetings(event as any);
            });
        }
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
        this.editCharDebounced(update);

        // Update token count if necessary
        if (event) {
            const textarea = event.target as HTMLTextAreaElement;
            const tokensSpan = textarea.closest('.inline-drawer-content')!.previousElementSibling!.querySelector('.tokens_count');
            if (tokensSpan) {
                tokensSpan.textContent = `Tokens: ${await this.st.getTokenCountAsync(this.st.substituteParams(textarea.value))}`;
            }
        }

        // Edit the Alt Greetings number on the main drawer
        $('#altGreetings_number').html(`Numbers: ${greetings.length}`);
    }
}
