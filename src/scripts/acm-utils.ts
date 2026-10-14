import { converter } from '/script.js';
import { encodeStyleTags, decodeStyleTags } from '/scripts/chats.js';
import { acm } from '../index';

/**
 * Escapes HTML special characters in a string to prevent XSS and DOM breakage.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHtml(str: string): string {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Creates a debounced version of the provided function that delays its execution
 * until after a specified timeout period has elapsed since the last time it was invoked.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} [timeout=300] - The time, in milliseconds, to delay the function execution.
 * @return {Function} A new debounced function that delays the execution of the original function.
 */
export function debounce<TArgs extends unknown[]>(
    func: (...args: TArgs) => void,
    timeout: number = 300,
): (...args: TArgs) => void {
    let timer: number;
    return (...args: TArgs) => {
        clearTimeout(timer);
        timer = window.setTimeout(() => func(...args), timeout);
    };
}

/**
 * Recursively merges `source` into `target` (mutating and returning `target`).
 * Plain objects are merged key by key; arrays and other values replace the target's.
 *
 * @param {object} target - The object to merge into.
 * @param {object} source - The object whose values take precedence.
 * @return {object} The merged target.
 */
export function mergeDeep(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    for (const [key, value] of Object.entries(source)) {
        if ($.isPlainObject(value) && $.isPlainObject(target[key])) {
            mergeDeep(target[key], value);
        } else {
            target[key] = $.isPlainObject(value) ? mergeDeep({}, value) : value;
        }
    }
    return target;
}

/**
 * Parses a comma-separated tag list: trims each tag and drops empty and duplicate entries.
 * "a,b , ,a" -> ["a", "b"]; "" -> [].
 *
 * @param {string} value - The raw comma-separated text.
 * @return {string[]} The cleaned list of tags.
 */
export function parseTagList(value: string): string[] {
    const tags = String(value ?? '').split(',').map(tag => tag.trim()).filter(Boolean);
    return [...new Set(tags)];
}

export interface TagRules {
    /** The character must have ALL of these. */
    mandatory?: readonly unknown[];
    /** The character must have AT LEAST ONE of these (ignored if empty). */
    facultative?: readonly unknown[];
    /** The character must have NONE of these. */
    excluded?: readonly unknown[];
}

/**
 * Checks a character's tags against mandatory / at-least-one / excluded tag rules.
 * Shared by the filter bar and custom categories. IDs are compared as strings, since
 * legacy tag IDs are numeric strings that can turn into numbers along the way.
 *
 * @param {unknown[]} characterTags - The character's tag IDs (from tagMap).
 * @param {TagRules} rules - The tag rules to apply.
 * @return {boolean} True if the character satisfies every rule.
 */
export function matchesTagRules(characterTags: readonly unknown[], rules: TagRules): boolean {
    const tags = new Set((characterTags ?? []).map(String));
    const { mandatory = [], facultative = [], excluded = [] } = rules;

    if (excluded.some(id => tags.has(String(id)))) return false;
    if (!mandatory.every(id => tags.has(String(id)))) return false;
    return !(facultative.length > 0 && !facultative.some(id => tags.has(String(id))));

}

/**
 * Returns a promise that resolves to the base64 encoded string of a file.
 * @param {Blob} file The file to read.
 * @returns {Promise<string>} A promise that resolves to the base64 encoded string.
 */
export function getBase64Async(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            resolve(String(reader.result));
        };
        reader.onerror = function (error) {
            reject(error);
        };
    });
}

/**
 * Resets the scroll height of a given HTML element to match its scrollable content height.
 *
 * @param {HTMLElement} element - The HTML element whose height needs to be reset.
 * @return {void} This function does not return a value.
 */
export async function resetScrollHeight(element: HTMLElement): Promise<void> {
    $(element).css('height', '0px');
    $(element).css('height', $(element).prop('scrollHeight') + 3 + 'px');
}

/**
 * Delays the current async function by the given number of milliseconds.
 * @param {number} ms Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after the given number of milliseconds
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Compares two strings for equality, ignoring case differences and accent marks.
 * This method determines whether the two strings are equal when case and accents are disregarded.
 *
 * @param {string} a - The first string to compare.
 * @param {string} b - The second string to compare.
 * @return {boolean} Returns true if the two strings are equal ignoring case and accents; otherwise, false.
 */
export function equalsIgnoreCaseAndAccents(a: string, b: string): boolean {
    return compareIgnoreCaseAndAccents(a, b, (a: string, b: string) => a === b);
}

/**
 * Performs a case-insensitive and accent-insensitive substring search.
 * This function normalizes the strings to remove diacritical marks and converts them to lowercase to ensure the search is insensitive to case and accents.
 *
 * @param {string} text - The text in which to search for the substring
 * @param {string} searchTerm - The substring to search for in the text
 * @returns {boolean} true if the searchTerm is found within the text, otherwise returns false
 */
export function includesIgnoreCaseAndAccents(text: string, searchTerm: string): boolean {
    return compareIgnoreCaseAndAccents(text, searchTerm, (a: string, b: string) => a?.includes(b) === true);
}

/**
 * A common base function for case-insensitive and accent-insensitive string comparisons.
 *
 * @param {string} a - The first string to compare.
 * @param {string} b - The second string to compare.
 * @param {(a:string,b:string)=>boolean} comparisonFunction - The function to use for the comparison.
 * @returns {*} - The result of the comparison.
 */
function compareIgnoreCaseAndAccents(a: string, b: string, comparisonFunction: (a: string, b: string) => boolean): any {
    if (!a || !b) return comparisonFunction(a, b); // Return the comparison result if either string is empty

    // Normalize and remove diacritics, then convert to lower case
    const normalizedA = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normalizedB = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Check if the normalized strings are equal
    return comparisonFunction(normalizedA, normalizedB);
}

/**
 * Retrieves the ID of a character based on their avatar.
 *
 * @param {string} avatar - The avatar image or identifier of the character.
 * @return {string|undefined} The ID of the character as a string if found, otherwise undefined.
 */
export function getIdByAvatar(avatar: string): string | undefined {
    if (!acm?.st?.characters || !Array.isArray(acm.st.characters)) return undefined;
    const index = acm.st.characters.findIndex((character: any) => character?.avatar === avatar);
    return index !== -1 ? String(index) : undefined;
}

/**
 * Returns the rendered card of a character in the ACM list, if it is currently in the DOM.
 * Scoped to the list because other SillyTavern UI (e.g. the welcome screen) also uses
 * `data-avatar`, and escaped because avatar filenames may contain quotes.
 *
 * @param {string} avatar - The avatar filename of the character.
 * @return {HTMLElement|null} The card element, or null if it isn't rendered.
 */
export function getCardElement(avatar: string | undefined): HTMLElement | null {
    if (!avatar) return null;
    return document.querySelector<HTMLElement>(`#character-list .card[data-avatar="${CSS.escape(avatar)}"]`);
}

/**
 * Updates the token count displayed for a specific input field.
 *
 * @param {string} fieldId - The ID of the input field for which the token count will be updated.
 * @return {Promise<void>} A promise that resolves once the token count has been updated and displayed.
 */
export async function updateTokenCount(fieldId: string): Promise<void> {
    const inputElement = $(fieldId);
    const tokenCountElement = $(`${fieldId}_tokens`);
    const inputValue = String(inputElement.val());
    const tokenCount = await acm.st.getTokenCountAsync(acm.st.substituteParams(inputValue));
    tokenCountElement.html(`Tokens: ${tokenCount}`);

    if (fieldId === '#acm_description') {
        $('#acm_tab_desc_tokens').text(`${tokenCount} tokens`);
    } else if (fieldId === '#acm_firstMess') {
        $('#acm_tab_greeting_tokens').text(`${tokenCount} tokens`);
    } else if (fieldId === '#acm_creator_notes_textarea') {
        $('#acm_tab_creatorsnotes_tokens').text(`${tokenCount} tokens`);
    }
}

/**
 * Renders creator's notes (Markdown/HTML) into sanitized HTML, the same way ST does for its
 * own creator's notes. Custom <style> rules are always scoped to `#acm_creatornotes_view`,
 * so a card can never restyle the rest of the UI.
 *
 * @param {string} text - The raw creator's notes.
 * @return {string} The sanitized HTML.
 */
export function renderCreatorNotes(text: string): string {
    if (!text) return '';
    let html = converter.makeHtml(acm.st.substituteParams(text));
    html = encodeStyleTags(html);
    html = SillyTavern.libs.DOMPurify.sanitize(html, { MESSAGE_SANITIZE: true, ADD_TAGS: ['custom-style'] });
    html = decodeStyleTags(html, { prefix: '#acm_creatornotes_view ' });
    return html;
}

/**
 * Converts a given date-like string to the "YYYY-MM-DD" format. Supports various input formats
 * such as ISO 8601 and custom formats containing an "@" character.
 *
 * @param {string | Date} createDate - The input date to be converted. Can be a string or a Date object.
 * @return {string} A formatted date string in "YYYY-MM-DD" format. Returns '-' if the input is invalid or cannot be parsed.
 */
export function toYYYYMMDD(createDate: string | Date): string {
    if (!createDate) return ' - ';

    const raw = String(createDate).trim();

    // New format: ISO 8601 → "2026-01-23T13:45:29.659Z"
    // Old format (yours): "YYYY-MM-DD@..." → take before "@"
    const datePart =
        raw.includes('T') ? raw.slice(0, 10) :          // ISO: YYYY-MM-DD...
            raw.split(/\s*@\s*/)[0].trim();

    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(datePart);
    if (!m) return ' - ';

    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
