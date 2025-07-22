import {
    selectAndDisplay, toggleCharacterCreationPopup, toggleFavoritesOnly, toggleTagsList,
    updateSearchFilter,
    updateSortOrder
} from "../components/charactersList.js";

export function initializeCharactersListEvents() {
    // Trigger when a character is selected in the list
    $(document).on('click', '.char_select', function () {
        selectAndDisplay(this.dataset.avatar);
    });
}

export function initializeToolbarEvents() {

    $(document).on('click', '#acm_tags_filter', toggleTagsList);

    // Tri des personnages
    $(document).on('change', '#char_sort_order', function () {
        updateSortOrder($(this).find(':selected'));
    });

    // Barre de recherche
    $(document).on('input', '#char_search_bar', function () {
        updateSearchFilter($(this).val());
    });

    // Case à cocher "Favoris uniquement"
    $('#favOnly_checkbox').on("change", function () {
        toggleFavoritesOnly(this.checked);
    });

    // Import de personnage par fichier
    $('#acm_character_import_button').on("click", function () {
        $('#character_import_file').trigger("click");
    });

    // Import de personnage par URL
    $('#acm_external_import_button').on("click", function () {
        $('#external_import_button').trigger("click");
    });

    // Popup de création de personnage
    $('#acm_character_create_button').on("click", toggleCharacterCreationPopup);

}
