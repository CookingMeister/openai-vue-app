import { markdownToHtml } from './markdown.js'
import { normalizeLanguage } from './languages.js'

// Incremental streaming renderer, ported from section 20 of the vanilla
// chatapp script.
//
// Re-parsing the whole answer and reassigning innerHTML on every tick costs
// time proportional to everything received so far, so a long reply pays that
// cost ~5 times a second and repaints every node it has already drawn --
// O(n^2) in both parsing and layout.
//
// Instead: markdown blocks that can no longer change are parsed once and
// frozen into the DOM, and only the block still being written is re-rendered.
// The caller does one clean full parse when the response completes, so
// anything approximated mid-stream is corrected at the end.
//
// This owns the children of the element it is given. In Vue that means the
// element must not also carry v-html or child nodes, or the two will fight --
// see the v-stream-markdown directive in App.vue.

const streamRenderState = new WeakMap()

// A line that may be continuing the block before it across a blank line, so
// that cutting there would split one block into two: a loose list item, a lazy
// blockquote, or anything indented at all. Indentation is deliberately "one
// space or more" rather than the four that starts an indented code block --
// continuing a list item only needs to reach that item's content column, which
// for a dash-space bullet is two.
const BLOCK_CONTINUATION_RE = /^(?:[ \t]|(?:[-*+]|\d{1,9}[.)])(?:\s|$)|>)/
const FENCE_LINE_RE = /^( {0,3})(`{3,}|~{3,})(.*)$/

const createStreamState = () => ({
    committedLen: 0, // source chars already frozen into the DOM
    frozenCount: 0, // contentEl child nodes that are final
    scanPos: 0, // how far the line scanner has consumed
    commitPoint: 0, // furthest cut known to be safe
    fence: null, // the open fence, while one is open
    pendingBlank: -1, // index after a blank line, awaiting the next line
    live: null, // the growing <code> text node, while a fence is open
})

export const resetStreamingRender = (contentEl) => {
    if (contentEl) streamRenderState.delete(contentEl)
}

// Consumes whole lines, remembering the furthest point that is certainly a
// block boundary. Only ever walks text arrived since the last tick, so the
// scan costs O(delta) rather than O(total).
const advanceStreamScan = (state, text) => {
    let i = state.scanPos

    while (i < text.length) {
        const nl = text.indexOf('\n', i)
        if (nl === -1) break // a partial last line: wait for the rest

        const line = text.slice(i, nl)
        const next = nl + 1

        if (state.fence) {
            const m = FENCE_LINE_RE.exec(line)

            // A closing fence uses the same character, is at least as long, and
            // carries no info string.
            const closes =
                m &&
                m[2][0] === state.fence.marker[0] &&
                m[2].length >= state.fence.marker.length &&
                !m[3].trim()

            if (closes) {
                // Only a fence opened at the left margin is certainly top
                // level; an indented one may belong to a list item still open.
                const wasTopLevel = state.fence.indent === ''
                state.fence = null
                if (wasTopLevel) state.commitPoint = next
            }
        } else if (!line.trim()) {
            state.pendingBlank = next
        } else {
            if (state.pendingBlank !== -1) {
                if (!BLOCK_CONTINUATION_RE.test(line)) {
                    state.commitPoint = state.pendingBlank
                }
                state.pendingBlank = -1
            }

            const m = FENCE_LINE_RE.exec(line)
            if (m) {
                state.fence = {
                    marker: m[2],
                    indent: m[1],
                    lang: m[3].trim(),
                    start: i,
                }
            }
        }

        i = next
    }

    state.scanPos = i
}

// markdownToHtml output is already escaped by the custom renderer, and a
// <template> is inert, so nothing here executes.
const parseMarkdownToFragment = (md) => {
    const tpl = document.createElement('template')
    tpl.innerHTML = markdownToHtml(md)
    return tpl.content
}

const dropLiveNodes = (contentEl, state) => {
    while (contentEl.childNodes.length > state.frozenCount) {
        contentEl.lastChild.remove()
    }

    state.live = null
}

// An unclosed code fence is the one tail that keeps growing. Its body is
// literal text, so the delta is appended to the existing <code> node instead of
// re-parsing a code block that gets longer every tick. Mirrors exactly what the
// marked renderer emits for a fenced block.
const renderOpenFenceTail = (contentEl, state, text) => {
    const { fence } = state

    // Only fences at the left margin. An indented one belongs to a list item,
    // and emitting a bare <pre> would pull it out of the list; those are rare
    // and short enough that re-parsing the tail is fine.
    if (fence.indent !== '') return false

    const bodyStart = text.indexOf('\n', fence.start)

    if (bodyStart === -1) return false // opener line not finished yet

    // Whole lines are always body. The trailing partial line is shown too,
    // except while it could still become the closing fence -- that line is
    // syntax, not content, and must never be painted into the block.
    const partial = text.slice(state.scanPos)
    const mayBecomeClosingFence =
        fence.marker[0] === '`'
            ? /^ {0,3}`*[ \t]*$/.test(partial)
            : /^ {0,3}~*[ \t]*$/.test(partial)

    // The newline ending the last body line is the separator before the closing
    // fence, and marked does not put it inside the code block, so drop it here
    // too -- otherwise the live block renders one blank line taller than the
    // finished one and the text shifts when the fence closes.
    const body = (
        text.slice(bodyStart + 1, state.scanPos) + (mayBecomeClosingFence ? '' : partial)
    ).replace(/\r?\n$/, '')

    if (state.live && state.live.fenceStart === fence.start && body.length >= state.live.len) {
        state.live.node.appendData(body.slice(state.live.len))
        state.live.len = body.length
        return true
    }

    dropLiveNodes(contentEl, state)

    // Anything between the last commit and the fence opener is ordinary
    // markdown -- a paragraph introducing the code block, typically.
    const prefix = text.slice(state.committedLen, fence.start)
    if (prefix.trim()) {
        contentEl.appendChild(parseMarkdownToFragment(prefix))
    }

    const lang = normalizeLanguage(fence.lang)
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    const bodyNode = document.createTextNode(body)

    code.className = `language-${lang}`
    code.dataset.language = lang
    code.appendChild(bodyNode)
    pre.appendChild(code)
    contentEl.appendChild(pre)

    state.live = { fenceStart: fence.start, node: bodyNode, len: body.length }
    return true
}

export const renderStreamingMarkdown = (contentEl, text) => {
    if (!contentEl) return

    let state = streamRenderState.get(contentEl)

    // Text going backwards means the element was handed a new stream, so start
    // clean rather than appending onto the previous answer.
    if (
        !state ||
        text.length < state.committedLen ||
        contentEl.childNodes.length < state.frozenCount
    ) {
        state = createStreamState()
        streamRenderState.set(contentEl, state)
        contentEl.textContent = ''
    }

    advanceStreamScan(state, text)

    // Freeze whatever has newly become unchangeable.
    if (state.commitPoint > state.committedLen) {
        dropLiveNodes(contentEl, state)
        contentEl.appendChild(
            parseMarkdownToFragment(text.slice(state.committedLen, state.commitPoint)),
        )
        state.committedLen = state.commitPoint
        state.frozenCount = contentEl.childNodes.length
    }

    if (state.fence && renderOpenFenceTail(contentEl, state, text)) return

    // Ordinary tail: a single unfinished block, so re-parsing it is cheap.
    dropLiveNodes(contentEl, state)

    const tail = text.slice(state.committedLen)
    if (tail.trim()) {
        contentEl.appendChild(parseMarkdownToFragment(tail))
    }
}
