// Token estimation, ported from section 4 of the vanilla chatapp script.
//
// Deliberately duplicated on the client (src/composables/useTokens.js) rather
// than imported across the package boundary: server and frontend are separate
// npm packages with separate node_modules, and a relative import across them
// breaks the moment the server is deployed on its own. The formula is four
// lines and must stay identical in both places -- change one, change the other.

// The set matched by \s in a JS regex, so word counting stays identical to the
// split(/\s+/) this replaced.
const isWhitespaceCode = (code) =>
    code === 0x20 || // space -- first because it dominates real text
    (code >= 0x09 && code <= 0x0d) || // tab, LF, VT, FF, CR
    (code >= 0x2000 &&
        (code <= 0x200a ||
            code === 0x2028 ||
            code === 0x2029 ||
            code === 0x202f ||
            code === 0x205f ||
            code === 0x3000 ||
            code === 0xfeff)) ||
    code === 0xa0 ||
    code === 0x1680

// Counts whitespace-delimited runs in one pass, without allocating a string
// per word.
export const countWords = (text, end = text.length) => {
    let words = 0
    let inWord = false

    for (let i = 0; i < end; i += 1) {
        if (isWhitespaceCode(text.charCodeAt(i))) {
            inWord = false
        } else if (!inWord) {
            inWord = true
            words += 1
        }
    }

    return words
}

export const estimateTokens = (text) => {
    if (!text) return 0
    const str = typeof text === 'string' ? text : String(text)
    return Math.max(1, Math.round(countWords(str) * 1.3))
}

export default estimateTokens
