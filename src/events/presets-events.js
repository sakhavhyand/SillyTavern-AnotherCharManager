import { getCategory, getPreset, removeTagFromCategory } from "../services/settings-service.js";
import { callPopup, POPUP_TYPE } from "../constants/context.js";
import {addCategory, printCategoriesList, removeCategory, renameCategory, renamePreset} from "../components/presets.js";

export function initializePresetsEvents() {
    $(document).on('change', '#preset_selector', function () {
        const newPreset = $(this).find(':selected').data('preset');
        $('#preset_name').html(getPreset(newPreset).name);
        printCategoriesList(newPreset);
    });

    // Trigger on a click on the rename preset button
    $(document).on("click", ".preset_rename", async function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const newPresetName = await callPopup('<h3>New preset name:</h3>', POPUP_TYPE.INPUT, getPreset(selectedPreset).name);
        if (newPresetName && newPresetName.trim() !== '') {
            renamePreset(selectedPreset, newPresetName);
        }
    });

    // Add new custom category to active preset
    $(document).on("click", ".cat_view_create", async function () {
        const newCatName = await callPopup('<h3>Category name:</h3>', POPUP_TYPE.INPUT, '');
        if (newCatName && newCatName.trim() !== '') {
            const selectedPreset = $('#preset_selector option:selected').data('preset');
            addCategory(selectedPreset, newCatName);
        }
    });

    // Trigger on a click on the delete category button
    $(document).on("click", ".cat_delete", function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        removeCategory(selectedPreset, selectedCat);
    });

    // Trigger on a click on the rename category button
    $(document).on("click", ".cat_rename", async function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        const newCatName = await callPopup('<h3>New category name:</h3>', POPUP_TYPE.INPUT, getCategory(selectedPreset, selectedCat).name);
        if (newCatName && newCatName.trim() !== '') {
            renameCategory(selectedPreset, selectedCat, newCatName);
        }
    });

    // Trigger on a click on the add tag button in a category
    $(document).on("click", ".addCatTag", function () {
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        $(this)
            .removeClass('addCatTag')
            .addClass('cancelCatTag')
            .removeClass('fa-plus')
            .addClass('fa-minus');
        $(`#input_cat_tag_${selectedCat}`).show();
    });

    // Trigger on a click on the minus tag button in a category
    $(document).on("click", ".cancelCatTag", function () {
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        $(this)
            .addClass('addCatTag')
            .removeClass('cancelCatTag')
            .addClass('fa-plus')
            .removeClass('fa-minus');
        $(`#input_cat_tag_${selectedCat}`).hide();
    });

    $(document).on("click", ".tag_cat_remove", function () {
        const selectedPreset = $('#preset_selector option:selected').data('preset');
        const selectedCat = $(this).closest('[data-catid]').data('catid');
        const selectedTag = $(this).closest('[data-tagid]').data('tagid');
        removeTagFromCategory(selectedPreset, selectedCat, selectedTag);
        $(this).closest('[data-tagid]').remove();
    });
}
