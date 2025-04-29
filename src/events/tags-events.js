import { tagFilterClick } from "../components/tags.js";

/**
 * Adds event listeners to elements with the class 'acm_tag' to handle click events.
 * Each click event triggers the `tagFilterClick` function with the corresponding tag element.
 *
 * @return {void} This method does not return a value.
 */
export function addListenersTagFilter() {
    const tags = document.querySelectorAll('.acm_tag');

    tags.forEach(tag => {
        tag.addEventListener('click', () => tagFilterClick(tag));
    });
}
