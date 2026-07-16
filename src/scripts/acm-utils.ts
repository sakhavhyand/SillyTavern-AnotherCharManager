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
export function debounce(func: Function, timeout: number = 300): Function {
    let timer: number;
    return (...args: any) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
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
export function getIdByAvatar(avatar: string): string | undefined{
    const index = acm.st.characters.findIndex((character: any) => character.avatar === avatar);
    return index !== -1 ? String(index) : undefined;
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
