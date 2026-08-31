import { marked } from 'marked'

import { normalizeLanguage } from '@/utils/languages.js'

// Markdown pipeline, ported from section 13 of the vanilla chatapp script.
//
// Model output is untrusted text that lands in innerHTML, so the renderer
// escapes raw HTML rather than passing it through, and validates every link
// protocol. This replaces marked's default renderer, which happily emits both.

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

// Works in the browser and under SSR/tests, where there is no window.
const BASE_ORIGIN =
    typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost'

export const escapeHtml = (s) => {
    if (s == null) return ''
    return String(s).replace(
        /[&<>"']/g,
        (m) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[m],
    )
}

export const isSafeHref = (href) => {
    if (!href) return false

    // Trim and strip control chars/whitespace that can smuggle protocols --
    // "java\nscript:alert(1)" parses as javascript: once the newline is gone,
    // so it has to be removed before the URL is examined, not after.
    // The C0 range skips \u0009-\u000D because \s already matches those.
    const cleaned = String(href)
        .trim()
        .replace(/[\u0000-\u0008\u000E-\u001F\u007F\s]+/g, '')

    // Internal anchors and same-origin relatives
    if (cleaned.startsWith('#') || cleaned.startsWith('/')) return true

    try {
        const url = new URL(cleaned, BASE_ORIGIN)
        return SAFE_PROTOCOLS.has(url.protocol)
    } catch {
        return false
    }
}

// Markdown that itself contains triple-backtick fences needs an outer fence
// longer than anything inside it, or the first inner fence closes the block
// early. The system prompt asks the model for four backticks; this repairs the
// cases where it forgets.
export const fixNestedMarkdownFences = (md) => {
    if (!md) return ''

    const lines = md.split(/\r?\n/)
    const out = []
    let i = 0

    // Matches a fence line. We only open on markdown|md.
    const openMdFenceRe = /^([ \t]*)(`{3,})(markdown|md)[ \t]*$/i

    while (i < lines.length) {
        const open = lines[i].match(openMdFenceRe)
        if (!open) {
            out.push(lines[i++])
            continue
        }

        const indent = open[1] || ''
        const openFence = open[2]
        const openFenceLen = openFence.length
        const lang = open[3]

        // Regexes that consider fences of length >= openFenceLen
        const fenceNoLangRe = new RegExp(`^[ \t]*\`{${openFenceLen},}[ \t]*$`)
        const fenceWithLangRe = new RegExp(
            `^[ \t]*\`{${openFenceLen},}[ \t]*([^\s\`][^\r\n]*)$`,
            'i',
        )

        // Find the true matching close by balancing inner openers/closers
        let j = i + 1
        let depth = 1

        for (; j < lines.length; j++) {
            const line = lines[j]

            if (fenceWithLangRe.test(line)) {
                depth++
            } else if (fenceNoLangRe.test(line)) {
                depth--
                if (depth === 0) break
            }
        }

        // If no proper closing fence found, keep the original line and continue
        if (j >= lines.length) {
            out.push(lines[i++])
            continue
        }

        const content = lines.slice(i + 1, j)

        // Longest backtick run at line start inside the content
        let longestRun = 0
        for (const l of content) {
            const m = l.match(/^[ \t]*(`{3,})/)
            if (m) longestRun = Math.max(longestRun, m[1].length)
        }

        // New fence length: one more than any run we saw, and > opening length
        const newLen = Math.max(openFenceLen + 1, longestRun + 1)
        const newFence = '`'.repeat(newLen)

        out.push(`${indent}${newFence}${lang}`)
        out.push(...content)
        out.push(`${indent}${newFence}`)

        i = j + 1
    }

    return out.join('\n')
}

// marked v9+ hands renderer methods a token object; older shapes passed loose
// arguments. Both are accepted so the renderer does not silently emit
// "[object Object]" if the call convention changes again.
export const renderer = {
    code(code, infostring) {
        let actualCode = ''
        let actualLang = ''

        if (code && typeof code === 'object') {
            actualCode = code.text || ''
            actualLang = code.lang || infostring || ''
        } else {
            actualCode = String(code || '')
            actualLang = String(infostring || '')
        }

        const lang = normalizeLanguage(actualLang)

        // data-language is what the copy/highlight pass reads, so it survives
        // even when the class is rewritten by Prism.
        return `<pre><code class="language-${lang}" data-language="${lang}">${escapeHtml(
            actualCode,
        )}</code></pre>`
    },

    html(htmlToken) {
        let htmlStr = ''

        if (htmlToken && typeof htmlToken === 'object') {
            htmlStr = htmlToken.text || htmlToken.raw || ''
        } else {
            htmlStr = String(htmlToken || '')
        }

        // Escape rather than emit. The model's output is not trusted markup.
        return escapeHtml(htmlStr)
    },

    link(href, title, text) {
        const actualHref =
            typeof href === 'object' ? href.href || href.raw || '' : String(href || '')
        const actualText =
            typeof href === 'object'
                ? href.text || href.raw || actualHref
                : String(text || href || 'Link')
        const actualTitle =
            typeof title === 'object' ? title.title || title.text || '' : String(title || '')

        const safe = isSafeHref(actualHref)
        const safeHref = safe ? actualHref : '#'
        const t = actualTitle ? ` title="${escapeHtml(actualTitle)}"` : ''

        return `<a href="${escapeHtml(
            safeHref,
        )}"${t} target="_blank" rel="noopener noreferrer nofollow ugc">${escapeHtml(
            actualText,
        )}</a>`
    },
}

let configured = false

export const configureMarked = () => {
    if (configured) return

    marked.setOptions({
        gfm: true,
        breaks: true,
        pedantic: false,
    })

    marked.use({ renderer })
    configured = true
}

export const markdownToHtml = (md) => {
    if (!md) return ''

    const text = String(md).replace(/\r\n?/g, '\n')

    configureMarked()
    return marked.parse(text)
}

// Full-fidelity parse for a finished message. Streaming skips the fence repair
// because a half-arrived block legitimately has no closing fence yet.
export const finalizeMarkdown = (md) => markdownToHtml(fixNestedMarkdownFences(md))
