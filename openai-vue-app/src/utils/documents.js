// Document text extraction, ported from section 5 of the vanilla chatapp
// script.
//
// pdf.js and mammoth are several hundred kilobytes each and most sessions
// never upload a document, so they are fetched from a CDN on first use rather
// than bundled. Versions are pinned with SRI hashes for the same reason the
// source pinned them: an unversioned CDN url silently upgrades under you, and
// a dynamically injected script gets no integrity check unless asked for one.

const CDN = {
    pdfJs: {
        src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
        integrity:
            'sha512-q+4liFwdPC/bNdhUpZx6aXDx/h77yEQtn4I1slHydcbZK34nLaR3cAeYSJshoxIOq3mjEf7xJE8YWIUHMn+oCQ==',
    },
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    mammoth: {
        src: 'https://unpkg.com/mammoth@1.9.1/mammoth.browser.min.js',
        integrity: 'sha384-Dmql2RDFhRnFI5K9k2OlF+n+0KL1nR4scY5Akjy8jw8GEbmChSzpsB6Q4Mv+xF0L',
    },
}

const CODE_EXTENSIONS = [
    'js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx', 'c', 'h', 'cpp', 'hpp', 'cc', 'cs',
    'java', 'py', 'rb', 'go', 'rs', 'php', 'swift', 'kt', 'sh', 'ps1', 'bat',
    'sql', 'json', 'xml', 'yml', 'yaml', 'css', 'ini', 'cfg', 'toml',
    'pls', 'plf', 'prj',
]

export const DOC_EXTENSIONS = [
    'txt', 'log', 'md', 'htm', 'html', 'pdf', 'docx',
    ...CODE_EXTENSIONS,
]

export const DOC_ACCEPT = DOC_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const DOC_EXT_RE = new RegExp(String.raw`\.(${DOC_EXTENSIONS.join('|')})$`, 'i')

export const isSupportedDocument = (nameOrFile) => {
    const name = typeof nameOrFile === 'string' ? nameOrFile : nameOrFile?.name || ''
    return DOC_EXT_RE.test(String(name).toLowerCase())
}

export const getBaseName = (pathOrFile) => {
    if (!pathOrFile) return 'unknown'

    const raw = typeof pathOrFile === 'string' ? pathOrFile : pathOrFile?.name || ''
    const parts = String(raw).split(/[\\/]/)

    return parts[parts.length - 1] || 'unknown'
}

// --- Lazy library loading ---

const scriptCache = new Map()

// Subresource integrity only applies to a cross-origin fetch, so an integrity
// hash without crossOrigin is silently ignored.
const applyIntegrity = (el, integrity) => {
    if (!integrity) return

    el.integrity = integrity
    el.crossOrigin = 'anonymous'
}

const loadScriptOnce = (src, { isReady, integrity } = {}) => {
    if (scriptCache.has(src)) return scriptCache.get(src)

    const promise = new Promise((resolve, reject) => {
        if (isReady?.()) {
            resolve()
            return
        }

        const s = document.createElement('script')

        // Everything affecting the fetch must be set before src, since
        // assigning src is what kicks the request off.
        applyIntegrity(s, integrity)

        s.src = src
        s.async = true
        s.onload = () => resolve()
        s.onerror = () => reject(new Error(`Failed to load script: ${src}`))

        document.head.appendChild(s)
    }).catch((err) => {
        scriptCache.delete(src)
        throw err
    })

    scriptCache.set(src, promise)
    return promise
}

const ensurePdfJs = async () => {
    if (window.pdfjsLib) return window.pdfjsLib

    await loadScriptOnce(CDN.pdfJs.src, {
        isReady: () => !!window.pdfjsLib,
        integrity: CDN.pdfJs.integrity,
    })

    if (!window.pdfjsLib) throw new Error('pdfjsLib not available after load')

    window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker

    return window.pdfjsLib
}

const ensureMammoth = async () => {
    if (window.mammoth) return window.mammoth

    await loadScriptOnce(CDN.mammoth.src, {
        isReady: () => !!window.mammoth,
        integrity: CDN.mammoth.integrity,
    })

    if (!window.mammoth) throw new Error('mammoth not available after load')

    return window.mammoth
}

// --- Extraction ---

const extractPdfText = async (file) => {
    const pdfjsLib = await ensurePdfJs()
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

    const pageTexts = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, idx) => {
            const page = await pdf.getPage(idx + 1)
            const textContent = await page.getTextContent()

            return textContent.items.map((it) => it.str).join(' ')
        }),
    )

    return pageTexts.join('\n\n').trim()
}

const extractDocxText = async (file) => {
    const mammoth = await ensureMammoth()
    const arrayBuffer = await file.arrayBuffer()
    const { value: rawText } = await mammoth.extractRawText({ arrayBuffer })

    // Null bytes survive some docx exports and poison both IndexedDB writes
    // and the JSON body the embeddings request is sent in.
    return (rawText || '').replace(/\u0000/g, '').trim()
}

// Visible text only. Parsed in an inert document so nothing in the uploaded
// file executes, and script/style content never reaches the model as prose.
const extractHtmlText = async (file) => {
    const html = await file.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    if (!doc?.body) return ''

    doc.querySelectorAll('script,style,iframe,frameset,noscript').forEach((n) => n.remove())

    return (doc.body.textContent || '').replace(/\u0000/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

const RE_HTML_PREFIX = /^\s*<!doctype\s+html|^\s*<html|^\s*<meta\s+charset/i

const getExtension = (file) => (getBaseName(file).match(/\.([A-Za-z0-9]+)$/) || [])[1]?.toLowerCase()

// Extension first, then content sniffing: files arrive misnamed often enough
// that a .txt holding a full HTML document is worth catching.
export const extractTextFromFile = async (file) => {
    const ext = getExtension(file)

    if (ext === 'pdf' || file.type === 'application/pdf') return extractPdfText(file)

    if (ext === 'docx') return extractDocxText(file)

    if (ext === 'doc') {
        throw new Error('Legacy .doc is not supported in-browser. Re-save it as .docx.')
    }

    if (ext === 'htm' || ext === 'html' || file.type === 'text/html') {
        return extractHtmlText(file)
    }

    const text = (await file.text()).replace(/\u0000/g, '').trim()

    if (RE_HTML_PREFIX.test(text)) return extractHtmlText(file)

    return text
}
