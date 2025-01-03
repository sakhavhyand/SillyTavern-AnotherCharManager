
export { debounce, getBase64Async, resetScrollHeight, delay, equalsIgnoreCaseAndAccents, includesIgnoreCaseAndAccents };

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

/**
 * Returns a promise that resolves to the base64 encoded string of a file.
 * @param {Blob} file The file to read.
 * @returns {Promise<string>} A promise that resolves to the base64 encoded string.
 */
function getBase64Async(file) {
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

async function resetScrollHeight(element) {
    $(element).css('height', '0px');
    $(element).css('height', $(element).prop('scrollHeight') + 3 + 'px');
}

/**
 * Delays the current async function by the given amount of milliseconds.
 * @param {number} ms Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after the given amount of milliseconds
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


function equalsIgnoreCaseAndAccents(a, b) {
    return compareIgnoreCaseAndAccents(a, b, (a, b) => a === b);
}

/**
 * Performs a case-insensitive and accent-insensitive substring search.
 * This function normalizes the strings to remove diacritical marks and converts them to lowercase to ensure the search is insensitive to case and accents.
 *
 * @param {string} text - The text in which to search for the substring
 * @param {string} searchTerm - The substring to search for in the text
 * @returns {boolean} true if the searchTerm is found within the text, otherwise returns false
 */
function includesIgnoreCaseAndAccents(text, searchTerm) {
    return compareIgnoreCaseAndAccents(text, searchTerm, (a, b) => a?.includes(b) === true);
}


/**
 * A common base function for case-insensitive and accent-insensitive string comparisons.
 *
 * @param {string} a - The first string to compare.
 * @param {string} b - The second string to compare.
 * @param {(a:string,b:string)=>boolean} comparisonFunction - The function to use for the comparison.
 * @returns {*} - The result of the comparison.
 */
function compareIgnoreCaseAndAccents(a, b, comparisonFunction) {
    if (!a || !b) return comparisonFunction(a, b); // Return the comparison result if either string is empty

    // Normalize and remove diacritics, then convert to lower case
    const normalizedA = a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normalizedB = b.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Check if the normalized strings are equal
    return comparisonFunction(normalizedA, normalizedB);
}
