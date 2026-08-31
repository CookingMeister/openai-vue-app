// Token estimation and history budgeting, ported from sections 4 and 15 of the
// vanilla chatapp script.
//
// countWords/estimateTokens are duplicated in server/utils/tokens.js -- see the
// note there for why. The two must stay identical.

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

// Counts whitespace-delimited runs in one pass, over a window of the string.
//
// The obvious spelling -- text.trim().split(/\s+/).length -- allocates a copy
// of the string plus one string per word. estimateTokens runs over every
// history message on each keystroke, so at 200k chars that was ~70k
// short-lived strings per keypress.
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

// Per-message cost including the framing the API adds around each turn.
//
// `ratio` is the running calibration factor: the estimator counts words, and
// how many tokens a word really costs varies by model and by content, so
// actual usage from a completed response is fed back in to correct it.
export const estimateMessageTokensWithOverhead = (message, ratio = 1) => {
    if (!message || typeof message !== 'object') {
        return 0
    }

    // A tool-trace record carries its weight in `toolTrace`, not in `content`
    // -- sizing it by the empty content string would tell the trimmer a round
    // of search results costs nothing and let it sit in the budget for free.
    if (Array.isArray(message.toolTrace) && message.toolTrace.length > 0) {
        let chars = 0

        for (const item of message.toolTrace) {
            chars += (item?.arguments || '').length
            chars += (item?.output || '').length
            chars += (item?.name || '').length
        }

        // Chars/4 rather than estimateTokens(): that one counts words, and JSON
        // is mostly punctuation and quoted keys, so word-counting a tool payload
        // reads far under what it actually costs.
        const raw = Math.ceil(chars / 4) + 6 * message.toolTrace.length
        return Math.round(raw * ratio)
    }

    if (typeof message.content !== 'string') {
        return 0
    }

    const raw = estimateTokens(message.content) + 6
    return Math.round(raw * ratio)
}

// Headroom left for the reply, tool framing, and estimator error.
export const CONTEXT_SAFETY_MARGIN = 8000

// Never drop the last two exchanges, even if a single message is huge.
export const HISTORY_MIN_MESSAGES = 4

export const getHistoryTokenBudget = ({
    contextWindow = 128000,
    reservedOutput = 0,
    historyTokenCap = 100000,
    systemPromptTokens = 0,
    docTokens = 0,
    ragTokens = 0,
} = {}) => {
    // Doc and RAG context are injected fresh each turn and compete with
    // history for the same input budget. The system prompt is prepended by the
    // server, so it is spent whether or not the client can see it.
    const available =
        Number(contextWindow) -
        Number(reservedOutput) -
        Number(systemPromptTokens) -
        Number(docTokens) -
        Number(ragTokens) -
        CONTEXT_SAFETY_MARGIN

    const cap = Number.isFinite(+historyTokenCap) ? +historyTokenCap : 100000

    return Math.max(0, Math.min(cap, Math.floor(available * 0.6)))
}

// Pick the most recent slice of history that fits the token budget. Returns a
// view; the caller's array is left untouched so storage keeps the full
// conversation.
export const selectHistoryForRequest = (history = [], budgetOptions = {}, ratio = 1) => {
    const safe = (history || []).filter(
        (m) =>
            m &&
            typeof m === 'object' &&
            typeof m.role === 'string' &&
            typeof m.content === 'string',
    )

    const systems = safe.filter((m) => m.role === 'system')
    const convo = safe.filter((m) => m.role !== 'system')

    const budget = getHistoryTokenBudget(budgetOptions)

    // The system prompt is always sent, so it spends the budget first.
    let used = systems.reduce(
        (sum, m) => sum + estimateMessageTokensWithOverhead(m, ratio),
        0,
    )

    let startIdx = convo.length

    for (let i = convo.length - 1; i >= 0; i--) {
        const cost = estimateMessageTokensWithOverhead(convo[i], ratio)
        const keptSoFar = convo.length - i

        if (used + cost > budget && keptSoFar > HISTORY_MIN_MESSAGES) break

        used += cost
        startIdx = i
    }

    // Don't lead with an assistant reply, or with the tool round that fed it,
    // when the user prompt they answer has been cut off.
    while (
        startIdx > 0 &&
        startIdx < convo.length - 1 &&
        (convo[startIdx]?.role === 'assistant' || convo[startIdx]?.role === 'tool')
    ) {
        used -= estimateMessageTokensWithOverhead(convo[startIdx], ratio)
        startIdx += 1
    }

    const kept = convo.slice(startIdx)

    return {
        systems,
        convo: kept,
        dropped: convo.length - kept.length,
        tokens: used,
        budget,
    }
}
