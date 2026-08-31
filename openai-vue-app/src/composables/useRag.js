import { ref, reactive, computed } from 'vue'

import {
    saveEmbeddings,
    getAllEmbeddings,
    getEmbeddedSources,
    deleteEmbeddingsForSource,
    clearAllEmbeddings,
} from '../utils/embeddingsDb.js'
import { chunkTextByTokens, sliceByTokenEstimate, estimateTokens, cosineSim } from './useTokens.js'

// Retrieval-augmented generation, ported from sections 9 and 10 of the vanilla
// chatapp script. Embedding requests go through the server rather than
// api.openai.com, but the index itself stays in the browser: the documents are
// the user's, and nothing about them needs to leave the machine except the
// text being embedded.

const RAG_SETTINGS_KEY = 'chatApp.ragSettings'
const ENABLED_SOURCES_KEY = 'chatApp.enabledRagSources'

// Saved per-model overrides win over these presets, which means editing a
// preset does nothing for anyone who has ever opened the RAG settings modal --
// submitting it persists the whole object, so every field becomes an
// "override" whether the user changed it or not. Bump this whenever the
// presets change so stale overrides are discarded on next load.
export const RAG_PRESET_VERSION = 2

export const DEFAULT_RAG_SETTINGS = {
    budgetTokens: 8000,
    minSnippetTokens: 250,
    topK: 6,
    minSim: 0.33,
    chunkingTokens: 500,
    overlapTokens: 64,
}

const EMBED_BATCH_SIZE = 32

// A tool-round result is paid for on top of the context already sent, so it is
// capped below the pre-injection budget.
const SEARCH_TOOL_MAX_TOP_K = 20

const clampInt = (v, min, max, fallback) => {
    const n = Number.isFinite(+v) ? Math.round(+v) : fallback
    return Math.min(max, Math.max(min, n))
}

const clampNum = (v, min, max, fallback) => {
    const n = Number.isFinite(+v) ? +v : fallback
    return Math.min(max, Math.max(min, n))
}

export const normalizeRagSettings = (raw = {}) => ({
    topK: clampInt(raw.topK, 1, 32, DEFAULT_RAG_SETTINGS.topK),
    minSim: clampNum(raw.minSim, 0, 1, DEFAULT_RAG_SETTINGS.minSim),
    chunkingTokens: clampInt(raw.chunkingTokens, 200, 8192, DEFAULT_RAG_SETTINGS.chunkingTokens),
    budgetTokens: clampInt(raw.budgetTokens, 1000, 20000, DEFAULT_RAG_SETTINGS.budgetTokens),
    overlapTokens: clampInt(raw.overlapTokens, 0, 1024, DEFAULT_RAG_SETTINGS.overlapTokens),
    minSnippetTokens: clampInt(raw.minSnippetTokens, 50, 1000, DEFAULT_RAG_SETTINGS.minSnippetTokens),
})

// --- shared state ---

const settings = reactive({ ...DEFAULT_RAG_SETTINGS })
const sources = ref([]) // every embedded source name
const enabledSources = ref([]) // the subset the user has ticked
const docContext = ref('')
const docName = ref('')
const busy = ref(false)
const progress = ref('')
const lastCitations = ref([])
// What the last retrieval actually cost, so the context budget can account for
// RAG without guessing.
const lastResolvedRagTokens = ref(0)

const loadStoredSettings = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(RAG_SETTINGS_KEY) || 'null')

        // A stored blob from before the current presets is discarded wholesale
        // rather than merged: its fields are indistinguishable from deliberate
        // overrides.
        if (!raw || raw.version !== RAG_PRESET_VERSION) return { ...DEFAULT_RAG_SETTINGS }

        return normalizeRagSettings(raw.settings || {})
    } catch {
        return { ...DEFAULT_RAG_SETTINGS }
    }
}

const persistSettings = () => {
    try {
        localStorage.setItem(
            RAG_SETTINGS_KEY,
            JSON.stringify({ version: RAG_PRESET_VERSION, settings: { ...settings } }),
        )
    } catch (err) {
        console.warn('Failed to save RAG settings:', err)
    }
}

const persistEnabledSources = () => {
    try {
        localStorage.setItem(ENABLED_SOURCES_KEY, JSON.stringify(enabledSources.value))
    } catch (err) {
        console.warn('Failed to save enabled sources:', err)
    }
}

const readStoredEnabledSources = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(ENABLED_SOURCES_KEY) || 'null')
        return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string') : null
    } catch {
        return null
    }
}

// --- embeddings API ---

const fetchEmbeddings = async (texts) => {
    const res = await fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: texts }),
    })

    if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Embeddings request failed (${res.status})`)
    }

    const { embeddings } = await res.json()

    if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
        throw new Error('Embeddings response did not match the request')
    }

    return embeddings
}

export const useRag = () => {
    const hasEmbeddings = computed(() => sources.value.length > 0)

    const hasEnabledSources = computed(
        () => hasEmbeddings.value && enabledSources.value.length > 0,
    )

    // A source list that no longer matches what is in the store leaves stale
    // names ticked; reconcile rather than trusting localStorage.
    const refreshSources = async () => {
        sources.value = await getEmbeddedSources()

        const stored = readStoredEnabledSources()
        const available = new Set(sources.value)

        enabledSources.value =
            stored === null
                ? [...sources.value] // no stored preference: everything is on
                : stored.filter((name) => available.has(name))

        persistEnabledSources()
        return sources.value
    }

    const init = async () => {
        Object.assign(settings, loadStoredSettings())
        await refreshSources()
    }

    const updateSettings = (partial) => {
        Object.assign(settings, normalizeRagSettings({ ...settings, ...partial }))
        persistSettings()
    }

    const setEnabledSources = (names) => {
        const available = new Set(sources.value)
        enabledSources.value = (names || []).filter((n) => available.has(n))
        persistEnabledSources()
    }

    const toggleSource = (name) => {
        const next = new Set(enabledSources.value)
        next.has(name) ? next.delete(name) : next.add(name)
        setEnabledSources([...next])
    }

    // --- indexing ---

    const embedText = async (text, sourceName) => {
        if (!text?.trim()) throw new Error(`No text content to embed from ${sourceName}`)

        busy.value = true
        progress.value = 'Chunking...'

        try {
            const chunks = chunkTextByTokens(text, settings.chunkingTokens, settings.overlapTokens)

            if (!chunks.length) {
                throw new Error('No chunks generated (the text may be empty after extraction).')
            }

            const stored = []

            for (let start = 0; start < chunks.length; start += EMBED_BATCH_SIZE) {
                const batch = chunks.slice(start, start + EMBED_BATCH_SIZE)

                progress.value = `Embedding ${start + 1}-${start + batch.length} of ${chunks.length}...`

                const vectors = await fetchEmbeddings(batch.map((c) => c.text))

                stored.push(
                    ...batch.map((chunk, j) => ({
                        // Deterministic id, so re-embedding a file replaces its
                        // chunks instead of accumulating duplicates.
                        id: `${sourceName}::${start + j}`,
                        embedding: vectors[j],
                        text: chunk.text,
                        tokens: chunk.tokens,
                        metadata: {
                            source: sourceName,
                            chunkIndex: start + j,
                            totalChunks: chunks.length,
                            createdAt: new Date().toISOString(),
                        },
                    })),
                )
            }

            // Old chunks first: a shorter re-embed of the same file would
            // otherwise leave the tail of the previous run orphaned in the
            // index, still matching searches.
            await deleteEmbeddingsForSource(sourceName)
            await saveEmbeddings(stored)
            await refreshSources()

            // Newly added sources are searched by default.
            if (!enabledSources.value.includes(sourceName)) {
                setEnabledSources([...enabledSources.value, sourceName])
            }

            progress.value = `Embedded ${stored.length} chunks from ${sourceName}`
            return stored.length
        } finally {
            busy.value = false
        }
    }

    const removeSource = async (name) => {
        await deleteEmbeddingsForSource(name)
        await refreshSources()
    }

    const clearEmbeddings = async () => {
        const count = await clearAllEmbeddings()
        await refreshSources()
        return count
    }

    // --- document context (a whole file inlined, no retrieval) ---

    const setDocContext = (text, name) => {
        docContext.value = text || ''
        docName.value = name || ''
    }

    const clearDocContext = () => {
        docContext.value = ''
        docName.value = ''
    }

    // --- retrieval ---

    const retrieve = async (query, options = {}) => {
        const {
            topK = settings.topK,
            minSim = settings.minSim,
            budgetTokens = settings.budgetTokens,
            minSnippetTokens = settings.minSnippetTokens,
            sources: requestedSources = enabledSources.value,
            maxChunksPerSource = 2,
        } = options

        // An explicit empty list means "search nothing", not "search everything".
        if (Array.isArray(requestedSources) && requestedSources.length === 0) {
            return { context: '', citations: [] }
        }

        const vectors = await getAllEmbeddings(
            requestedSources?.length ? { sources: requestedSources } : {},
        )

        if (!vectors.length) return { context: '', citations: [] }

        // With a narrowed source set, allow more chunks each so the topK budget
        // is not wasted: topK 12 over 2 sources gives 6 apiece, not 2.
        const effectiveMaxChunks = requestedSources?.length
            ? Math.max(maxChunksPerSource, Math.floor(topK / requestedSources.length))
            : maxChunksPerSource

        const [queryEmbedding] = await fetchEmbeddings([query])

        // Score into a compact {row, similarity} list. Copying every stored
        // record just to hang a score off it allocates one object per chunk per
        // search, and the sort then shuffles records carrying their text and
        // embedding around. Filtering during the scan keeps the sort small too.
        const ranked = []

        for (let i = 0; i < vectors.length; i += 1) {
            const similarity = cosineSim(queryEmbedding, vectors[i]?.embedding)

            if (similarity >= minSim) ranked.push({ row: i, similarity })
        }

        ranked.sort((a, b) => b.similarity - a.similarity)

        const perSource = new Map()
        const scored = []

        for (const entry of ranked) {
            const vector = vectors[entry.row]
            const src = vector.metadata?.source || ''
            const count = perSource.get(src) || 0

            if (count >= effectiveMaxChunks) continue

            perSource.set(src, count + 1)
            scored.push({ vector, similarity: entry.similarity })

            if (scored.length >= topK) break
        }

        // Each chunk gets an equal share of the budget as a soft ceiling, so a
        // single large early chunk cannot consume everything before lower-ranked
        // chunks are reached. Chunks still expand into unused headroom, but
        // never shrink below minSnippetTokens.
        const fairShare = Math.ceil(budgetTokens / Math.max(1, topK))

        const blocks = []
        let usedTokens = 0

        for (let i = 0; i < scored.length; i++) {
            const s = scored[i]
            const remaining = budgetTokens - usedTokens

            if (remaining <= 0) break

            const wantTokens = Math.min(remaining, Math.max(minSnippetTokens, fairShare))
            const snippet = sliceByTokenEstimate(s.vector.text.trim(), wantTokens)

            if (!snippet) continue

            blocks.push(
                `[${i + 1}] (source: ${s.vector.metadata.source}, chunk: ${s.vector.metadata.chunkIndex}, score: ${s.similarity.toFixed(3)})\n${snippet}`,
            )

            usedTokens += estimateTokens(snippet)
        }

        const citations = scored.map((s, i) => ({
            idx: i + 1,
            source: s.vector.metadata.source,
            chunkIndex: s.vector.metadata.chunkIndex,
            similarity: s.similarity,
        }))

        return { context: blocks.join('\n\n-----\n\n'), citations, tokens: usedTokens }
    }

    // Never let a retrieval failure take the whole turn down: answering without
    // context beats not answering.
    const safeRetrieve = async (query, options = {}) => {
        try {
            const result = await retrieve(query, options)

            lastCitations.value = result.citations
            lastResolvedRagTokens.value = result.tokens || 0

            return result
        } catch (err) {
            console.warn('RAG retrieval failed, continuing without embeddings:', err)
            lastCitations.value = []
            lastResolvedRagTokens.value = 0

            return { context: '', citations: [] }
        }
    }

    // --- search_documents tool handler ---

    // Resolves what the model asked for against what actually exists. The
    // distinction between "nothing embedded", "all disabled" and "no such file"
    // matters: each needs a different instruction, or the model either retries
    // forever or gives up when it should retry.
    const resolveSearchableSources = (requested) => {
        const available = sources.value
        const enabled = enabledSources.value

        if (!available.length) return { reason: 'none-embedded', available, sources: [] }
        if (!enabled.length) return { reason: 'all-disabled', available, sources: [] }

        if (!Array.isArray(requested) || requested.length === 0) {
            return { reason: 'ok', available, sources: enabled }
        }

        const lookup = new Map(enabled.map((name) => [name.toLowerCase(), name]))
        const matched = []
        const unmatched = []

        for (const name of requested) {
            const hit = lookup.get(String(name || '').toLowerCase())
            hit ? matched.push(hit) : unmatched.push(name)
        }

        if (!matched.length) {
            // Suggest near misses by substring: the model usually asks for a
            // recognisable fragment of the real name.
            const suggestions = enabled.filter((name) =>
                unmatched.some((u) => {
                    const needle = String(u || '').toLowerCase()
                    return needle && name.toLowerCase().includes(needle.slice(0, 6))
                }),
            )

            return { reason: 'no-match', available, sources: [], unmatched, suggestions }
        }

        return { reason: 'ok', available, sources: matched }
    }

    const searchDocuments = async ({ query, sources: requested, top_k: topK } = {}) => {
        const text = typeof query === 'string' ? query.trim() : ''

        if (!text) return { ok: false, error: 'A non-empty query is required.' }

        const resolved = resolveSearchableSources(requested)

        if (resolved.reason === 'none-embedded') {
            return {
                ok: true,
                found: 0,
                snippets: [],
                note: 'The search did not run: the user has not embedded any documents, so the index is empty. Tell them to add documents first. Do not retry.',
            }
        }

        if (resolved.reason === 'all-disabled') {
            return {
                ok: true,
                found: 0,
                snippets: [],
                note: 'The search did not run: the user has unchecked every document source in settings. This is their setting, not an error. Do not retry.',
            }
        }

        if (resolved.reason === 'no-match') {
            const named = resolved.unmatched.map((n) => `"${n}"`).join(', ')
            const hint = resolved.suggestions.length
                ? ` Did you mean ${resolved.suggestions.map((s) => `"${s}"`).join(' or ')}?`
                : ''

            return {
                ok: true,
                found: 0,
                snippets: [],
                available_sources: resolved.available,
                unmatched_sources: resolved.unmatched,
                did_you_mean: resolved.suggestions,
                note: `The search did not run because no embedded document is named ${named}.${hint} Document search itself is working and enabled. Retry with an exact name from available_sources, or omit sources to search all of them.`,
            }
        }

        const limit =
            topK == null
                ? Math.min(settings.topK, SEARCH_TOOL_MAX_TOP_K)
                : clampInt(topK, 1, SEARCH_TOOL_MAX_TOP_K, settings.topK)

        const result = await retrieve(text, {
            topK: limit,
            sources: resolved.sources,
            budgetTokens: Math.min(settings.budgetTokens, 6000),
        })

        if (!result.citations.length) {
            return {
                ok: true,
                found: 0,
                snippets: [],
                available_sources: resolved.available,
                note: `Nothing in the enabled documents matched "${text}" above the similarity threshold. The search itself worked. Try different wording once; if that also returns nothing, say the documents do not appear to cover it.`,
            }
        }

        return {
            ok: true,
            found: result.citations.length,
            snippets: result.citations,
            context: result.context,
        }
    }

    return {
        settings,
        sources,
        enabledSources,
        docContext,
        docName,
        busy,
        progress,
        lastCitations,
        lastResolvedRagTokens,
        hasEmbeddings,
        hasEnabledSources,
        init,
        refreshSources,
        updateSettings,
        setEnabledSources,
        toggleSource,
        embedText,
        removeSource,
        clearEmbeddings,
        setDocContext,
        clearDocContext,
        retrieve,
        safeRetrieve,
        searchDocuments,
    }
}

export default useRag
