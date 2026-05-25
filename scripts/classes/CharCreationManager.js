import { createTagMapFromList } from "/scripts/tags.js";
import { ensureImageFormatSupported } from "/scripts/utils.js";
import { delay, getBase64Async, updateTokenCount } from '../utils.js';

export class CharCreationManager {
    constructor(eventManager, settings, st) {
        this.eventManager = eventManager;
        this.settings = settings;
        this.st = st;
    }
    /**
     * A mapping of field names to their corresponding CSS selectors.
     * This object is used to associate form fields in the character creation popup
     * with their respective DOM elements for easier manipulation and data binding.
     */
    static FIELD_CONFIGURATIONS = {
        'name': '#acm_create_name',
        'description': '#acm_create_desc',
        'firstMessage': '#acm_create_first',
        'systemPrompt': '#acm_create_system_prompt',
        'postHistoryInstructions': '#acm_create_post_history_instructions',
        'personality': '#acm_create_personality',
        'scenario': '#acm_create_scenario',
        'depthPrompt': '#acm_create_depth_prompt',
        'messageExample': '#acm_create_mes_example',
    };

    /**
     * Initializes event listeners for the character creation interface. Binds input events to update relevant character creation data and adds functionality for character creation operations such as creating a character, closing the popup, toggling the layout, and adding an avatar.
     *
     * @return {void} This function does not return a value.
     */
    initializeCharacterCreationEvents() {

        this.eventManager.on('modal:toggleCreation', ()=> {
            this.toggleCharacterCreationPopup();
        })

        const elementsToInitialize = {
            '#acm_create_name': async () => { this.settings.updateCreateData('name', String($('#acm_create_name').val())); await updateTokenCount('#acm_create_name');},
            '#acm_create_desc': async () => { this.settings.updateCreateData('description', String($('#acm_create_desc').val())); await updateTokenCount('#acm_create_desc');},
            '#acm_creator_notes_textarea2': () => { this.settings.updateCreateData('creator_notes', String($('#acm_creator_notes_textarea2').val())); },
            '#acm_character_version_textarea2': () => { this.settings.updateCreateData('character_version', String($('#acm_character_version_textarea2').val())); },
            '#acm_create_system_prompt': async () => { this.settings.updateCreateData('system_prompt', String($('#acm_create_system_prompt').val())); await updateTokenCount('#acm_create_system_prompt');},
            '#acm_create_post_history_instructions': async () => { this.settings.updateCreateData('post_history_instructions', String($('#acm_create_post_history_instructions').val())); await updateTokenCount('#acm_create_post_history_instructions');},
            '#acm_creator_textarea2': () => { this.settings.updateCreateData('creator', String($('#acm_creator_textarea2').val())); },
            '#acm_tags_textarea2': () => { this.settings.updateCreateData('tags', String($('#acm_tags_textarea2').val())); },
            '#acm_create_personality': async () => { this.settings.updateCreateData('personality', String($('#acm_create_personality').val())); await updateTokenCount('#acm_create_personality');},
            '#acm_create_scenario': async () => { this.settings.updateCreateData('scenario', String($('#acm_create_scenario').val())); await updateTokenCount('#acm_create_scenario');},
            '#acm_create_mes_example': async () => { this.settings.updateCreateData('mes_example', String($('#acm_create_mes_example').val())); await updateTokenCount('#acm_create_mes_example');},
            '#acm_create_first': async () => { this.settings.updateCreateData('first_message', String($('#acm_create_first').val())); await updateTokenCount('#acm_create_first');},
            '#acm_talkativeness_slider2': () => { this.settings.updateCreateData('talkativeness', Number($('#acm_talkativeness_slider2').val())); },
            '#acm_create_depth_prompt': async () => { this.settings.updateCreateData('depth_prompt_prompt', String($('#acm_create_depth_prompt').val())); await updateTokenCount('#acm_create_depth_prompt');},
            '#acm_depth_prompt_depth2': () => { this.settings.updateCreateData('depth_prompt_depth', Number($('#acm_depth_prompt_depth2').val())); },
            '#acm_depth_prompt_role2': () => { this.settings.updateCreateData('depth_prompt_role', String($('#acm_depth_prompt_role2').val())); },
        };

        Object.keys(elementsToInitialize).forEach(function (id) {
            $(id).on('input', function () {
                elementsToInitialize[id]();
            });
        });

        // Create the character
        $('#acm_create_popup_create').on('click',  ()=> {
            this.initiateCharacterCreation();
        });

        // Close character creation popup
        $('#acm_create_popup_close').on('click', ()=> {
            this.toggleCharacterCreationPopup();
        });

        // Switch panel during character creation
        $('#column-separator').on('click',  ()=> {
            if ($('#acm_left_panel').hasClass('panel-hidden')){
                this.updateLayout(false);
            }
            else {
                this.updateLayout(true);
            }
        });

        // Add the avatar
        $('#acm_add_avatar_button').on('change',  (event) => {
            this.loadAvatar(event.currentTarget);
        });
    }

    /**
     * Toggles the visibility of the character creation popup.
     * This function handles the initialization of form fields with existing data,
     * updates token counts, and manages the display state of the popup.
     *
     * @return {void} This function does not return a value.
     */
    toggleCharacterCreationPopup() {
        const $popup = $('#acm_create_popup');
        if ($popup.css('display') === 'none') {

            this.eventManager.emit('modal:closeDetails');
            // Initialize all form fields with create_data values
            $('#acm_create_name').val(this.settings.create_data.name);
            $('#acm_create_desc').val(this.settings.create_data.description);
            $('#acm_create_first').val(this.settings.create_data.first_message);
            $('#acm_create_system_prompt').val(this.settings.create_data.system_prompt);
            $('#acm_create_post_history_instructions').val(this.settings.create_data.post_history_instructions);
            $('#acm_create_personality').val(this.settings.create_data.personality);
            $('#acm_create_scenario').val(this.settings.create_data.scenario);
            $('#acm_create_depth_prompt').val(this.settings.create_data.depth_prompt_prompt);
            $('#acm_create_mes_example').val(this.settings.create_data.mes_example);
            // Metadata fields
            $('#acm_creator_textarea2').val(this.settings.create_data.creator);
            $('#acm_character_version_textarea2').val(this.settings.create_data.character_version);
            $('#acm_creator_notes_textarea2').val(this.settings.create_data.creator_notes);
            $('#acm_tags_textarea2').val(this.settings.create_data.tags);
            // Numeric/select fields
            $('#acm_depth_prompt_depth2').val(this.settings.create_data.depth_prompt_depth);
            $('#acm_depth_prompt_role2').val(this.settings.create_data.depth_prompt_role);
            $('#acm_talkativeness_slider2').val(this.settings.create_data.talkativeness);
            // Tags input field
            $('#acmTagInput').empty();

            // Update token counts for all fields
            Object.values(CharCreationManager.FIELD_CONFIGURATIONS).forEach(selector => {
                updateTokenCount(`${selector}`);
            });
            // Avatar handling
            $('#acm_create_avatar').attr('src', 'img/ai4.png');
            // Display the popup
            $popup.css({ 'display': 'flex', 'opacity': 0.0 })
                .addClass('open')
                .transition({
                    opacity: 1.0,
                    duration: 125,
                    easing: 'ease-in-out',
                });
        } else {
            // Hide the popup
            // Apply a transition effect to fade out the popup
            $popup.transition({
                opacity: 0,
                duration: 125,
                easing: 'ease-in-out',
            });
            // Hide the popup after the transition is complete
            setTimeout(function () { $('#acm_create_popup').css('display', 'none'); }, 125);
            // Reset the character creation data to its default state
            this.settings.resetCreateData();
            // Update token counts for all fields in the form
            Object.values(CharCreationManager.FIELD_CONFIGURATIONS).forEach(selector => {
                updateTokenCount(`${selector}`);
            });
            // Clear the tag list in the popup
            $('#acmTagList').empty();
            // Ensure the layout is updated to show the main panel if the advanced panel is hidden
            if ($('#acm_left_panel').hasClass('panel-hidden')){
                this.updateLayout(false);
            }
        }
    }

    /**
     * Updates the layout of the character creation interface by toggling
     * the visibility of the left and right panels based on the provided parameter.
     *
     * @param {boolean} showAdvanced - A flag indicating whether to show the advanced panel.
     * @return {void} This function does not return a value.
     */
    updateLayout(showAdvanced) {
        if (!showAdvanced) {
            // Show the main panel and hide the advanced panel
            $('#acm_left_panel').removeClass('panel-hidden');
            $('#acm_right_panel').addClass('panel-hidden');
            $('#separator-label').text('Advanced Definitions');
        } else {
            // Show the advanced panel and hide the main panel
            $('#acm_right_panel').removeClass('panel-hidden');
            $('#acm_left_panel').addClass('panel-hidden');
            $('#separator-label').text('Main Definitions');
        }
    }

    /**
     * Loads and processes an avatar image file.
     * This function handles the selection of an avatar image file, converts it to a Base64 string,
     * and optionally allows the user to crop the image before setting it as the avatar.
     *
     * @async
     * @param {HTMLInputElement} input - The file input element containing the selected avatar file.
     *                                   The `files` property should contain the uploaded file.
     *
     * @return {Promise<void>} This function does not return a value.
     */
    async loadAvatar(input) {
        if (input.files && input.files[0]) {
            // Update the avatar data in the creation settings
            this.settings.updateCreateData('avatar', input.files);
            // Reset the crop data
            this.settings.setCrop_data(undefined);
            const file = input.files[0];
            const fileData = await getBase64Async(file);
            // Check if the user has disabled avatar resizing
            if (!this.st.never_resize_avatars) {
                // // Display a cropping dialog for the avatar image
                const dlg = await this.st.callGenericPopup('Set the crop position of the avatar image', this.st.POPUP_TYPE.CROP, '', { cropImage: fileData });

                if (!dlg) {
                    console.error('The popup object is invalid:', dlg);
                    return;
                }

                // Save the crop data and set the cropped image as the avatar
                this.settings.setCrop_data(dlg.cropData);
                $('#acm_create_avatar').attr('src', String(dlg));
            } else {
                // Directly set the Base64 image as the avatar
                $('#acm_create_avatar').attr('src', fileData);
            }
        }
    }


    /**
     * Initiates the character creation process by validating the input fields,
     * preparing the form data, and sending it to the server.
     * This function collects all the necessary data from the character creation form,
     * including text fields, numeric fields, and file uploads, and submits it
     * using the `createCharacter` service.
     *
     * @async
     * @return {Promise<void>} This function does not return a value.
     */
    async initiateCharacterCreation(){
        // Validate that the character name is not empty
        if (String($('#acm_create_name').val()).length === 0) {
            toastr.error(this.st.t`Name is required`);
            return;
        }
        const formData = new FormData();
        // Add simple fields (string, number) to the form data
        formData.append('ch_name', this.settings.create_data.name || '');
        formData.append('description', this.settings.create_data.description || '');
        formData.append('creator_notes', this.settings.create_data.creator_notes || '');
        formData.append('post_history_instructions', this.settings.create_data.post_history_instructions || '');
        formData.append('character_version', this.settings.create_data.character_version || '');
        formData.append('system_prompt', this.settings.create_data.system_prompt || '');
        formData.append('tags', this.settings.create_data.tags || '');
        formData.append('creator', this.settings.create_data.creator || '');
        formData.append('personality', this.settings.create_data.personality || '');
        formData.append('first_mes', this.settings.create_data.first_message || '');
        formData.append('scenario', this.settings.create_data.scenario || '');
        formData.append('mes_example', this.settings.create_data.mes_example || '');
        formData.append('world', this.settings.create_data.world || '');
        formData.append('talkativeness', this.settings.create_data.talkativeness);
        formData.append('depth_prompt_prompt', this.settings.create_data.depth_prompt_prompt || '');
        formData.append('depth_prompt_depth', this.settings.create_data.depth_prompt_depth);
        formData.append('depth_prompt_role', this.settings.create_data.depth_prompt_role);
        formData.append('fav', false);
        formData.append('json_data', '');
        formData.append('chat', '');
        formData.append('create_date', '');
        formData.append('last_mes', '');
        formData.append('avatar_url', '');
        // Add an avatar file if it exists
        if (this.settings.create_data.avatar) {
            if (this.settings.create_data.avatar instanceof FileList) {
                formData.append('avatar', this.settings.create_data.avatar[0]);
            } else if (this.settings.create_data.avatar instanceof File) {
                formData.append('avatar', this.settings.create_data.avatar);
            }
        }
        // Add alternate greetings to the form data
        for (const value of this.settings.create_data.alternate_greetings) {
            formData.append('alternate_greetings', value);
        }
        // Add extra books and extensions as JSON strings
        formData.append('extra_books', JSON.stringify(this.settings.create_data.extra_books));
        formData.append('extensions', JSON.stringify(this.settings.create_data.extensions));
        // Submit the form data to create the character
        try {
            let url = '/api/characters/create';
            const headers = this.st.getRequestHeaders({ omitContentType: true });
            if (this.settings.acm_crop_data != undefined) {
                url += `?crop=${encodeURIComponent(JSON.stringify(this.settings.acm_crop_data))}`;
            }
            const rawFile = formData.get('avatar');
            if (rawFile instanceof File) {
                const convertedFile = await ensureImageFormatSupported(rawFile);
                formData.set('avatar', convertedFile);
            }
            const fetchResult = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: formData,
                cache: 'no-cache',
            });

            if (!fetchResult.ok) {
                throw new Error('Fetch result is not ok');
            }

            const avatarId = await fetchResult.text();
            createTagMapFromList('#acmTagList', avatarId);
            this.settings.setCrop_data(undefined);
            await delay(500);
            this.toggleCharacterCreationPopup();
            await this.st.getCharacters();
            this.eventManager.emit('charList:refresh');
            this.eventManager.emit('char:select', {avatar: avatarId, scrollTo: true});
        }
        catch (error) {
            console.error('Error creating character', error);
            toastr.error(this.st.t`Failed to create character`);
        }
    }
}

