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

// --- Chunking (section 4 of the vanilla chatapp script) ---

// Same result estimateTokens would give for text.slice(0, end), without
// materialising the prefix.
const estimatePrefixTokens = (text, end) =>
    end <= 0 ? 0 : Math.max(1, Math.round(countWords(text, end) * 1.3))

// Longest prefix that fits the budget, found by binary search on the estimate.
export const sliceByTokenEstimate = (text, maxTokens) => {
    if (!text) return ''

    let lo = 0
    let hi = text.length
    let ans = 0

    while (lo <= hi) {
        const mid = (lo + hi) >> 1

        if (estimatePrefixTokens(text, mid) <= maxTokens) {
            ans = mid
            lo = mid + 1
        } else {
            hi = mid - 1
        }
    }

    return text.slice(0, ans)
}

// What estimateTokens would return for a string containing `words` words.
//
// Word counts are additive across any whitespace join, but token counts are
// not -- rounding makes estimate(a) + estimate(b) differ from estimate(a+b).
// So the running counters below track words and convert only at the end.
const tokensFromWords = (words) => (words > 0 ? Math.max(1, Math.round(words * 1.3)) : 0)

// The pass below carries four pieces of mutable state: the finished chunks,
// the parts of the chunk being built, its running token count, and the word
// count those parts add up to. They are held in one object so the
// paragraph/line/word helpers can share them.
const createChunkState = () => ({ chunks: [], parts: [], tokens: 0, words: 0 })

const flushChunk = (state) => {
    if (state.parts.length === 0) return

    state.chunks.push({ text: state.parts.join('\n\n').trim(), tokens: state.tokens })
    state.parts = []
    state.tokens = 0
    state.words = 0
}

// Adds a part and re-measures. Joining introduces separators but no new words,
// so the measure is the running word count converted to tokens -- identical to
// re-tokenizing the whole join, which is what this used to do on every append.
const appendPart = (state, part) => {
    state.parts.push(part)
    state.words += countWords(part)
    state.tokens = tokensFromWords(state.words)
}

// Last resort: a single line over the budget, broken into runs of words.
const pushWordChunks = (line, max, chunks) => {
    let buf = []
    let bufWords = 0

    for (const w of line.split(/\s+/)) {
        // Each split piece is one word, except the empty string a leading
        // separator produces, which is none.
        const wordCount = countWords(w)

        if (tokensFromWords(bufWords) + tokensFromWords(wordCount) > max) {
            chunks.push({ text: buf.join(' '), tokens: tokensFromWords(bufWords) })
            buf = [w]
            bufWords = wordCount
        } else {
            buf.push(w)
            bufWords += wordCount
        }
    }

    if (buf.length) {
        chunks.push({ text: buf.join(' '), tokens: tokensFromWords(bufWords) })
    }
}

// A paragraph over the budget: pack its lines, emitting whatever has
// accumulated whenever the next line would overflow.
const addOversizedParagraph = (paragraph, max, state) => {
    const lines = paragraph
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)

    let buf = []
    let bufTokens = 0

    for (const line of lines) {
        const lineTokens = estimateTokens(line)

        if (bufTokens + lineTokens <= max) {
            buf.push(line)
            bufTokens += lineTokens
            continue
        }

        if (buf.length) {
            appendPart(state, buf.join('\n'))
            flushChunk(state)
        }

        if (lineTokens > max) {
            pushWordChunks(line, max, state.chunks)
        } else {
            state.chunks.push({ text: line, tokens: lineTokens })
        }

        buf = []
        bufTokens = 0
    }

    // Trailing lines stay open so the next paragraph can join them.
    if (buf.length) appendPart(state, buf.join('\n'))
}

// A paragraph within budget: start a new chunk if it would not fit.
//
// This keeps its own token arithmetic -- a running sum plus 2 per separator,
// deliberately a slight overestimate -- rather than the exact join measure
// appendPart uses. Only the word count is shared, so an appendPart call later
// in the same chunk still measures the whole buffer correctly.
const addParagraph = (paragraph, tokens, max, state) => {
    if (state.tokens + tokens + 2 > max) {
        flushChunk(state)
        state.tokens = tokens
    } else {
        state.tokens += tokens + 2
    }

    state.parts.push(paragraph)
    state.words += countWords(paragraph)
}

// Prefix each chunk with the tail of the previous one so context carries over
// a boundary that may have split a sentence or a definition.
const applyChunkOverlap = (chunks, overlapTokens) => {
    const takeWords = Math.round(overlapTokens / 1.3) || 30

    return chunks.map((chunk, idx, arr) => {
        if (idx === 0) return { text: chunk.text, tokens: estimateTokens(chunk.text) }

        const prevWords = arr[idx - 1].text.split(/\s+/).filter(Boolean)
        const text = `${prevWords.slice(-takeWords).join(' ')}\n\n${chunk.text}`

        return { text, tokens: estimateTokens(text) }
    })
}

export const chunkTextByTokens = (text, maxTokens = 500, overlap = 64) => {
    if (!text) return []

    const max = typeof maxTokens === 'number' ? maxTokens : 500
    const ov = typeof overlap === 'number' ? overlap : 64

    const paragraphs = text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)

    const state = createChunkState()

    for (const paragraph of paragraphs) {
        const tokens = estimateTokens(paragraph)

        if (tokens > max) {
            addOversizedParagraph(paragraph, max, state)
        } else {
            addParagraph(paragraph, tokens, max, state)
        }
    }

    flushChunk(state)

    return ov > 0 && state.chunks.length > 1
        ? applyChunkOverlap(state.chunks, ov)
        : state.chunks
}

// --- Vector similarity ---

// Hoisting the query's norm out of the scan was tried and reverted upstream: it
// is arithmetically a third less work per element, but a scan of a few thousand
// 1536-dim vectors is bound by reading ~50MB of doubles, not by the
// multiply-accumulates, and it measured as pure noise.
export const cosineSim = (a, b) => {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0

    let dot = 0
    let normA = 0
    let normB = 0

    for (let index = 0; index < a.length; index += 1) {
        const valueA = Number(a[index]) || 0
        const valueB = Number(b[index]) || 0

        dot += valueA * valueB
        normA += valueA * valueA
        normB += valueB * valueB
    }

    if (normA === 0 || normB === 0) return 0

    return dot / Math.sqrt(normA * normB)
}
