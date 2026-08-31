import Prism from 'prismjs'

import { PRISM_DEPS, SKIP_LANGUAGES, normalizeLanguage } from '@/utils/languages.js'

// On-demand Prism grammar loading, ported from section 3 of the vanilla
// chatapp script.
//
// This replaces the bundled `autoloader` plugin, which resolves neither the
// alias table nor the dependency graph: it would ask the CDN for "prism-js.js"
// (404) and load tsx without jsx or typescript, leaving those blocks unstyled.
//
// Grammars come from the CDN rather than the npm package because Vite cannot
// statically analyse `import('prismjs/components/prism-' + lang + '.js')`, so
// bundling them would mean shipping all ~300 grammars to every visitor.

const PRISM_VERSION = '1.30.0'
const BASE_URL = `https://cdn.jsdelivr.net/npm/prismjs@${PRISM_VERSION}/components/`

// Prism's grammar files attach themselves to the global, so it has to exist
// before any of them run.
if (typeof window !== 'undefined') {
    window.Prism = window.Prism || Prism
}

const scriptCache = new Map()

const loadScriptOnce = (src) => {
    if (scriptCache.has(src)) return scriptCache.get(src)

    const promise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`)

        if (existing) {
            if (existing.dataset.loaded === 'true') {
                resolve()
                return
            }

            existing.addEventListener('load', () => resolve(), { once: true })
            existing.addEventListener(
                'error',
                () => reject(new Error(`Failed to load script: ${src}`)),
                { once: true },
            )
            return
        }

        const s = document.createElement('script')
        s.src = src
        s.async = true

        s.onload = () => {
            s.dataset.loaded = 'true'
            resolve()
        }

        s.onerror = () => reject(new Error(`Failed to load script: ${src}`))

        document.head.appendChild(s)
    }).catch((err) => {
        // Drop the rejected promise so a later block can retry rather than
        // inheriting a permanent failure from one flaky network moment.
        scriptCache.delete(src)
        throw err
    })

    scriptCache.set(src, promise)
    return promise
}

const inFlightLoads = new Map()

const loadPrismLanguage = async (language) => {
    const lang = normalizeLanguage(language)

    if (!lang || SKIP_LANGUAGES.has(lang)) return null
    if (Prism.languages?.[lang]) return lang

    if (inFlightLoads.has(lang)) return inFlightLoads.get(lang)

    const promise = loadScriptOnce(`${BASE_URL}prism-${lang}.min.js`)
        .then(() => lang)
        .finally(() => inFlightLoads.delete(lang))

    inFlightLoads.set(lang, promise)
    return promise
}

const depLoadCache = new Map()

// `seen` guards against a cycle in PRISM_DEPS sending this into infinite
// recursion; the map dedupes concurrent requests for the same grammar.
export const loadLanguageWithDeps = async (language, seen = new Set()) => {
    const lang = normalizeLanguage(language)

    if (!lang || SKIP_LANGUAGES.has(lang)) return null
    if (Prism.languages?.[lang]) return lang

    if (seen.has(lang)) return null
    seen.add(lang)

    if (depLoadCache.has(lang)) return depLoadCache.get(lang)

    const promise = (async () => {
        // Dependencies must be present before the grammar that extends them is
        // evaluated, so these are awaited in order rather than in parallel.
        for (const dep of PRISM_DEPS[lang] || []) {
            await loadLanguageWithDeps(dep, seen)
        }

        if (Prism.languages?.[lang]) return lang

        return loadPrismLanguage(lang)
    })().finally(() => {
        depLoadCache.delete(lang)
    })

    depLoadCache.set(lang, promise)
    return promise
}

// Highlights one element, fetching its grammar first if necessary. Resolves
// once the element has actually been highlighted.
export const highlightElement = async (codeEl) => {
    if (!codeEl) return

    const lang = normalizeLanguage(
        codeEl.dataset?.language ||
            [...codeEl.classList].find((c) => c.startsWith('language-')) ||
            '',
    )

    if (SKIP_LANGUAGES.has(lang)) return

    try {
        await loadLanguageWithDeps(lang)
    } catch (err) {
        // An unknown language 404s. The block still reads fine unhighlighted,
        // so this is not worth surfacing to the user.
        console.debug(`Prism grammar unavailable for "${lang}":`, err.message)
        return
    }

    if (!Prism.languages?.[lang]) return

    // The element can be detached while the grammar was in flight -- a new
    // response replacing the bubble, say. Highlighting it then is wasted work.
    if (!codeEl.isConnected) return

    Prism.highlightElement(codeEl)
}

export { Prism }
