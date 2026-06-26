import { escapeHtml } from '../acm-utils';

interface Category {
    name: string;
    tags?: string[];
    mandatoryTags?: string[];
    facultativeTags?: string[];
    excludedTags?: string[];
}

interface Preset {
    name: string;
    categories: Category[];
}

export class PresetManager {
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
        this.registerListeners();
        this.updateDropdownPresetNames();
    }

    registerListeners(): void {
        $(document).on('change', '#preset_selector', (event: JQuery.TriggeredEvent) => {
            const $element = $(event.currentTarget);
            const newPreset = $element.find(':selected').data('preset');
            $('#preset_name').html(this.getPreset(newPreset).name);
            this.printCategoriesList(newPreset);
        });

        // Trigger on a click on the rename preset button
        $(document).on('click', '.preset_rename', async () => {
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            const newPresetName = await this.st.callGenericPopup('<h3>New preset name:</h3>', this.st.POPUP_TYPE.INPUT, this.getPreset(selectedPreset).name);
            if (newPresetName && newPresetName.trim() !== '') {
                this.updatePresetName(selectedPreset, newPresetName);
                $('#preset_name').html(newPresetName);
                $('#preset_selector option').filter((_: number, element: HTMLElement) => $(element).data('preset') === selectedPreset).text(newPresetName);
                this.updateDropdownPresetNames();
            }
        });

        // Add new custom category to active preset
        $(document).on('click', '.cat_view_create', async () => {
            const newCatName = await this.st.callGenericPopup('<h3>Category name:</h3>', this.st.POPUP_TYPE.INPUT, '');
            if (newCatName && newCatName.trim() !== '') {
                const selectedPreset = $('#preset_selector option:selected').data('preset');
                this.addPresetCategory(selectedPreset, newCatName);
                this.printCategoriesList(selectedPreset);
            }
        });

        // Trigger on a click on the delete category button
        $(document).on('click', '.cat_delete', (event: JQuery.TriggeredEvent) => {
            const $element = $(event.currentTarget);
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            const selectedCat = $element.closest('[data-catid]').data('catid');
            this.removePresetCategory(selectedPreset, selectedCat);
            this.printCategoriesList(selectedPreset);
        });

        // Trigger on a click on the rename category button
        $(document).on('click', '.cat_rename', async (event: JQuery.TriggeredEvent) => {
            const $element = $(event.currentTarget);
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            const selectedCat = $element.closest('[data-catid]').data('catid');
            const newCatName = await this.st.callGenericPopup('<h3>New category name:</h3>', this.st.POPUP_TYPE.INPUT, this.getCategory(selectedPreset, selectedCat).name);
            if (newCatName && newCatName.trim() !== '') {
                this.updateCategoryName(selectedPreset, selectedCat, newCatName);
                this.printCategoriesList(selectedPreset);
            }
        });

        // Trigger on a click on the add tag button in a category
        $(document).on('click', '.addCatTag', (event: JQuery.TriggeredEvent) => {
            const $element = $(event.currentTarget);
            const selectedCat = $element.closest('[data-catid]').data('catid');
            this.toggleTagButton($element);
        });

        // Trigger on a click on the minus tag button in a category
        $(document).on('click', '.cancelCatTag', (event: JQuery.TriggeredEvent) => {
            const $element = $(event.currentTarget);
            const selectedCat = $element.closest('[data-catid]').data('catid');
            this.toggleTagButton($element);
        });

        $(document).on('click', '.tag_cat_remove', (event: JQuery.TriggeredEvent) => {
            const $element = $(event.currentTarget);
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            const selectedCat = $element.closest('[data-catid]').data('catid');
            const selectedTag = $element.closest('[data-tagid]').data('tagid');

            // Determine tag type from the parent section
            const tagSection = $element.closest('[data-tagtype]');
            const tagType = tagSection.length > 0 ? tagSection.data('tagtype') : 'mandatory';

            this.removeTagFromCategory(selectedPreset, selectedCat, selectedTag, tagType);
            $element.closest('[data-tagid]').remove();
        });

        this.eventManager.on('tag:addTagToCat', (data: any) => {
            const tagType = data.tagType || 'mandatory';
            this.addTagToCategory(data.presetId, data.categoryId, data.tagId, tagType);
        });

        this.eventManager.on('modal:openPresetManager', () => {
            this.manageCustomCategories();
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            if (this.settings.getSetting('dropdownUI') && this.settings.getSetting('dropdownMode') === 'custom') {
                $('.popup-button-ok').on('click', this.eventManager.emit('charList:refresh'));
            }
            this.printCategoriesList(selectedPreset, true);
        });

        // Toggle category collapse
        $(document).on('click', '.acm_catList', (event: JQuery.TriggeredEvent) => {
            if ($(event.target).closest('.drag-handle, .menu_button').length) return;
            $(event.currentTarget).siblings('.acm_catTagSections').stop().slideToggle();
        });
    }

    /**
     * Gets a specific preset by index
     */
    getPreset(presetIndex: number): Preset {
        if (presetIndex < 0 || presetIndex >= this.settings.getSetting('dropdownPresets').length) {
            throw new Error('Invalid preset index');
        }
        return { ...this.settings.getSetting('dropdownPresets')[presetIndex] };
    }

    /**
     * Gets a specific category from a preset
     */
    getCategory(presetIndex: number, categoryIndex: number): Category {
        const preset = this.getPreset(presetIndex);
        if (categoryIndex < 0 || categoryIndex >= preset.categories.length) {
            throw new Error('Invalid category index');
        }
        return { ...preset.categories[categoryIndex] };
    }

    /**
     * Updates a specific preset name
     */
    updatePresetName(presetIndex: number, name: string): void {
        if (presetIndex < 0 || presetIndex >= this.settings.getSetting('dropdownPresets').length) {
            throw new Error('Invalid preset index');
        }
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('Preset name must be a non-empty string');
        }
        const updatedPresets = [...this.settings.getSetting('dropdownPresets')];
        updatedPresets[presetIndex] = {
            ...updatedPresets[presetIndex],
            name: name,
        };
        this.settings.updateSetting('dropdownPresets', updatedPresets);
    }

    /**
     * Updates all categories of a specific preset
     */
    updatePresetCategories(presetIndex: number, categories: Category[]): void {
        if (presetIndex < 0 || presetIndex >= this.settings.getSetting('dropdownPresets').length) {
            throw new Error('Invalid preset index');
        }
        if (!Array.isArray(categories)) {
            throw new Error('Categories must be an array');
        }
        if (!categories.every(category =>
            typeof category === 'object' &&
            typeof category.name === 'string' &&
            Array.isArray(category.tags),
        )) {
            throw new Error('Invalid category format. Each category must have a name (string) and tags (array)');
        }
        const updatedPresets = [...this.settings.getSetting('dropdownPresets')];
        updatedPresets[presetIndex] = {
            ...updatedPresets[presetIndex],
            categories: [...categories],
        };
        this.settings.updateSetting('dropdownPresets', updatedPresets);
    }

    /**
     * Adds a new category to a preset
     */
    addPresetCategory(presetIndex: number, name: string): void {
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('Category name must be a non-empty string');
        }
        const updatedPresets = [...this.settings.getSetting('dropdownPresets')];
        updatedPresets[presetIndex] = {
            ...updatedPresets[presetIndex],
            categories: [...updatedPresets[presetIndex].categories, { name, tags: [] }],
        };
        this.settings.updateSetting('dropdownPresets', updatedPresets);
    }

    /**
     * Updates a specific category in a preset
     */
    updateCategoryName(presetIndex: number, categoryIndex: number, name: string): void {
        const preset = this.getPreset(presetIndex);
        if (categoryIndex < 0 || categoryIndex >= preset.categories.length) {
            throw new Error('Invalid category index');
        }
        if (typeof name !== 'string' || name.trim() === '') {
            throw new Error('Category name must be a non-empty string');
        }
        const updatedPresets = [...this.settings.getSetting('dropdownPresets')];
        updatedPresets[presetIndex].categories[categoryIndex] = {
            ...updatedPresets[presetIndex].categories[categoryIndex],
            name,
        };
        this.settings.updateSetting('dropdownPresets', updatedPresets);
    }

    /**
     * Removes a category from a preset
     */
    removePresetCategory(presetIndex: number, categoryIndex: number): void {
        const preset = this.getPreset(presetIndex);
        if (categoryIndex < 0 || categoryIndex >= preset.categories.length) {
            throw new Error('Invalid category index');
        }
        const updatedPresets = [...this.settings.getSetting('dropdownPresets')];
        updatedPresets[presetIndex].categories = updatedPresets[presetIndex].categories
            .filter((_: Category, index: number) => index !== categoryIndex);
        this.settings.updateSetting('dropdownPresets', updatedPresets);
    }

    /**
     * Adds a tag to a category
     */
    addTagToCategory(presetIndex: number, categoryIndex: number, tagId: string, tagType: string = 'mandatory'): void {
        const category = this.getCategory(presetIndex, categoryIndex);
        const fieldMap: Record<string, string> = {
            'mandatory': 'mandatoryTags',
            'facultative': 'facultativeTags',
            'excluded': 'excludedTags',
        };
        const fieldName = fieldMap[tagType] || 'mandatoryTags';

        // Ensure the field exists
        if (!category[fieldName]) {
            category[fieldName] = [];
        }

        if (category[fieldName].includes(tagId)) {
            return; // Tag already exists in the category
        }

        const updatedPresets = [...this.settings.getSetting('dropdownPresets')];
        updatedPresets[presetIndex].categories[categoryIndex][fieldName].push(tagId);

        // Maintain backwards compatibility: keep 'tags' pointing to mandatoryTags
        if (fieldName === 'mandatoryTags') {
            updatedPresets[presetIndex].categories[categoryIndex].tags =
                updatedPresets[presetIndex].categories[categoryIndex].mandatoryTags;
        }

        this.settings.updateSetting('dropdownPresets', updatedPresets);
    }

    /**
     * Removes a tag from a category
     */
    removeTagFromCategory(presetIndex: number, categoryIndex: number, tagId: string, tagType: string = 'mandatory'): void {
        const fieldMap: Record<string, string> = {
            'mandatory': 'mandatoryTags',
            'facultative': 'facultativeTags',
            'excluded': 'excludedTags',
        };
        const fieldName = fieldMap[tagType] || 'mandatoryTags';

        const updatedPresets = [...this.settings.getSetting('dropdownPresets')];
        const category = updatedPresets[presetIndex].categories[categoryIndex];

        if (category[fieldName]) {
            category[fieldName] = category[fieldName].filter((id: string) => id !== tagId);
        }

        // Maintain backwards compatibility: keep 'tags' pointing to mandatoryTags
        if (fieldName === 'mandatoryTags') {
            category.tags = category.mandatoryTags;
        }

        this.settings.updateSetting('dropdownPresets', updatedPresets);
    }

    /**
     * Normalizes a category structure for backwards compatibility.
     */
    normalizeCategory(category: Category): Category {
        // If category doesn't have the new structure but has old 'tags', migrate it
        if (!category.mandatoryTags && category.tags) {
            category.mandatoryTags = [...category.tags];
        }

        // Ensure all tag type arrays exist
        if (!category.mandatoryTags) category.mandatoryTags = [];
        if (!category.facultativeTags) category.facultativeTags = [];
        if (!category.excludedTags) category.excludedTags = [];

        // Maintain backwards compatibility: keep 'tags' as reference to mandatoryTags
        category.tags = category.mandatoryTags;

        return category;
    }

    /**
     * Updates the names of the preset items in a dropdown menu.
     */
    updateDropdownPresetNames(): void {
        $('#preset-submenu .dropdown-ui-item').each((index: number, element: HTMLElement) => {
            const $element = $(element);
            const presetIndex = $element.data('preset');
            const newName = this.getPreset(presetIndex).name;
            if (newName) { $element.text(newName); }
        });
    }

    /**
     * Manages the custom categories interface in the application.
     */
    manageCustomCategories(): void {
        const html = $(document.createElement('div'));
        html.attr('id', 'acm_custom_categories');
        const selectElement = $(`<select id="preset_selector" title="Preset Selector"></select>`);
        this.settings.getSetting('dropdownPresets').forEach((preset: Preset, index: number) => {
            selectElement.append(`<option data-preset="${index}">${escapeHtml(preset.name)}</option>`);
        });
        html.append(`
            <div class="title_restorable alignItemsBaseline">
                <h3>Custom Categories</h3>
                <div class="flex-container alignItemsBaseline">
                    ${selectElement.prop('outerHTML')}
                </div>
            </div>
             <div>
                <div style="display:flex;">
                     <h4 id="preset_name">${escapeHtml(this.getPreset(0).name)}</h4>
                     <i class="menu_button fa-solid fa-edit preset_rename" title="Rename preset"></i>
                </div>
                <div class="acm_catCreate">
                    <div class="menu_button menu_button_icon cat_view_create" title="Create a new category">
                        <i class="fa-solid fa-plus"></i>
                        <span data-i18n="Create">Create</span>
                    </div>
                    <small>
                        Drag handle to reorder.
                    </small>
                </div>
             </div>
        `);
        this.st.callGenericPopup(html, this.st.POPUP_TYPE.TEXT, '', { okButton: 'Close', allowVerticalScrolling: true });
    }

    /**
     * Displays the list of categories for a specified preset ID in the user interface.
     */
    printCategoriesList(presetID: number, init: boolean = false): void {
        const catContainer = init
            ? $('<div id="catContainer"></div>')
            : $('#catContainer').empty() && $('#catContainer');

        const preset = this.getPreset(presetID);
        if (!preset.categories?.length) {
            catContainer.append('No category defined');
            $('#acm_custom_categories').append(catContainer);
        }
        else {
            preset.categories.forEach((cat: Category, index: number) => {
                // Normalize category for backwards compatibility
                cat = this.normalizeCategory(cat);

                const catHTML = `
                        <div data-catid="${index}">
                            <div class="acm_catList">
                                <div class="drag-handle ui-sortable-handle" data-i18n="[title]Drag to reorder categories">☰</div>
                                <h4>- ${escapeHtml(cat.name)} -</h4>
                                <div style="display:flex;">
                                    <div class="menu_button fa-solid fa-edit cat_rename" title="Rename category"></div>
                                    <div class="menu_button fa-solid fa-trash cat_delete" title="Delete category"></div>
                                </div>
                            </div>
                            <div class="acm_catTagSections" style="display: none;">
                                <div class="acm_catTagSection" data-tagtype="mandatory">
                                    <h5>Mandatory Tags:</h5>
                                    <div id="acm_catTagList_${index}_mandatory" class="acm_catTagList"></div>
                                </div>
                                <div class="acm_catTagSection" data-tagtype="facultative">
                                    <h5>At Least One Tags:</h5>
                                    <div id="acm_catTagList_${index}_facultative" class="acm_catTagList"></div>
                                </div>
                                <div class="acm_catTagSection" data-tagtype="excluded">
                                    <h5>Excluded Tags:</h5>
                                    <div id="acm_catTagList_${index}_excluded" class="acm_catTagList"></div>
                                </div>
                            </div>
                        </div>`;
                const catElement = $(catHTML);

                // Render mandatory tags
                const mandatoryList = catElement.find(`#acm_catTagList_${index}_mandatory`);
                if (cat.mandatoryTags && cat.mandatoryTags.length > 0) {
                    cat.mandatoryTags.forEach(tag => {
                        mandatoryList.append(this.tagManager.displayTag(tag, 'category'));
                    });
                }
                mandatoryList.append(`<label for="input_cat_tag_${index}_mandatory" title="Search or create a tag.">
                                    <input id="input_cat_tag_${index}_mandatory" class="text_pole tag_input wide100p margin0 ui-autocomplete-input" placeholder="Search tags" maxlength="50" autocomplete="off" style="display: none">
                                </label>`);
                mandatoryList.append('<i class="fa-solid fa-plus tag addCatTag"></i>');

                // Render facultative tags
                const facultativeList = catElement.find(`#acm_catTagList_${index}_facultative`);
                if (cat.facultativeTags && cat.facultativeTags.length > 0) {
                    cat.facultativeTags.forEach(tag => {
                        facultativeList.append(this.tagManager.displayTag(tag, 'category'));
                    });
                }
                facultativeList.append(`<label for="input_cat_tag_${index}_facultative" title="Search or create a tag.">
                                    <input id="input_cat_tag_${index}_facultative" class="text_pole tag_input wide100p margin0 ui-autocomplete-input" placeholder="Search tags" maxlength="50" autocomplete="off" style="display: none">
                                </label>`);
                facultativeList.append('<i class="fa-solid fa-plus tag addCatTag"></i>');

                // Render excluded tags
                const excludedList = catElement.find(`#acm_catTagList_${index}_excluded`);
                if (cat.excludedTags && cat.excludedTags.length > 0) {
                    cat.excludedTags.forEach(tag => {
                        excludedList.append(this.tagManager.displayTag(tag, 'category'));
                    });
                }
                excludedList.append(`<label for="input_cat_tag_${index}_excluded" title="Search or create a tag.">
                                    <input id="input_cat_tag_${index}_excluded" class="text_pole tag_input wide100p margin0 ui-autocomplete-input" placeholder="Search tags" maxlength="50" autocomplete="off" style="display: none">
                                </label>`);
                excludedList.append('<i class="fa-solid fa-plus tag addCatTag"></i>');

                catContainer.append(catElement);
                $('#acm_custom_categories').append(catContainer);

                // Initialize tag inputs for all three types
                this.tagManager.acmCreateTagInput(`#input_cat_tag_${index}_mandatory`, `#acm_catTagList_${index}_mandatory`, { tagOptions: { removable: true } }, 'category');
                this.tagManager.acmCreateTagInput(`#input_cat_tag_${index}_facultative`, `#acm_catTagList_${index}_facultative`, { tagOptions: { removable: true } }, 'category');
                this.tagManager.acmCreateTagInput(`#input_cat_tag_${index}_excluded`, `#acm_catTagList_${index}_excluded`, { tagOptions: { removable: true } }, 'category');
            });
            this.makeCategoryDraggable('#catContainer');
        }
    }

    /**
     * Makes the categories draggable and sortable within the specified container.
     */
    makeCategoryDraggable(containerSelector: string): void {
        $(containerSelector).sortable({
            handle: '.drag-handle',
            items: '> div',
            tolerance: 'pointer',
            placeholder: 'sortable-placeholder',
            update: () => {
                const newOrder: number[] = [];
                $(containerSelector).children('div').each(function (this: HTMLElement) {
                    newOrder.push($(this).data('catid'));
                });
                const presetID = $('#preset_selector option:selected').data('preset');
                const currentCategories = this.getPreset(presetID).categories;
                this.updatePresetCategories(presetID, newOrder.map(index => currentCategories[index]));
            },
        });

        $('.drag-handle')
            .on('mousedown', function (this: HTMLElement) { $(this).css('cursor', 'grabbing'); })
            .on('mouseup', function (this: HTMLElement) { $(this).css('cursor', 'grab'); });
    }

    /**
     * Toggles the state of a tag button between "add" and "cancel" styles.
     */
    toggleTagButton(button: JQuery<HTMLElement>): void {
        // Find the input within the same tag section
        const tagSection = button.closest('.acm_catTagList');
        const input = tagSection.find('input.tag_input');

        if (button.hasClass('addCatTag')) {
            button
                .removeClass('addCatTag')
                .addClass('cancelCatTag')
                .removeClass('fa-plus')
                .addClass('fa-minus');
            input.show();
        } else {
            button
                .addClass('addCatTag')
                .removeClass('cancelCatTag')
                .addClass('fa-plus')
                .removeClass('fa-minus');
            input.hide();
        }
    }
}
