import { ref, computed, reactive } from 'vue'

// The registry lives on the server (server/config/models.js) because the server
// is what decides which id and token cap actually reach OpenAI. The client
// fetches it once so there is no second copy of the table to drift.

const REASONING_STORAGE_KEY = 'chatApp.reasoningLevels'

const models = ref([])
const registry = reactive({
    defaultModelKey: null,
    historyTokenCap: 100000,
    systemPromptTokens: 0,
    reasoningLabels: {},
})
const currentModelKey = ref(null)
const loaded = ref(false)
const loadError = ref(null)

// Keyed by model *id*, not by registry key, so a saved preference survives the
// key being renamed and follows the model if it is listed twice.
const reasoningLevels = reactive({})

let loadPromise = null

const readStoredReasoning = () => {
    try {
        const raw = localStorage.getItem(REASONING_STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch (err) {
        console.warn('Failed to load reasoning levels:', err)
        return {}
    }
}

const persistReasoning = () => {
    try {
        localStorage.setItem(REASONING_STORAGE_KEY, JSON.stringify({ ...reasoningLevels }))
    } catch (err) {
        console.warn('Failed to save reasoning levels:', err)
    }
}

const findModel = (key) =>
    models.value.find((m) => m.key === key) ||
    models.value.find((m) => m.key === registry.defaultModelKey) ||
    models.value[0] ||
    null

export const useModels = () => {
    const loadModels = async () => {
        if (loadPromise) return loadPromise

        loadPromise = (async () => {
            const res = await fetch('/api/models')
            if (!res.ok) throw new Error(`Failed to load models (${res.status})`)

            const data = await res.json()

            models.value = data.models || []
            registry.defaultModelKey = data.defaultModelKey
            registry.historyTokenCap = data.historyTokenCap ?? 100000
            registry.systemPromptTokens = data.systemPromptTokens ?? 0
            registry.reasoningLabels = data.reasoningLabels || {}

            Object.assign(reasoningLevels, readStoredReasoning())

            if (!currentModelKey.value) {
                currentModelKey.value = data.defaultModelKey
            }

            loaded.value = true
            return models.value
        })().catch((err) => {
            loadError.value = err.message
            loadPromise = null
            throw err
        })

        return loadPromise
    }

    const activeModel = computed(() => findModel(currentModelKey.value))

    const reasoningOptions = computed(() => activeModel.value?.reasoningOptions ?? null)

    const supportsReasoning = computed(() => !!reasoningOptions.value?.length)

    // Mirrors the server's resolveReasoning so the UI never shows a level the
    // request would silently replace.
    const normalizeReasoning = (effort, model = activeModel.value) => {
        const options = model?.reasoningOptions
        if (!options?.length) return null

        // Migrate old saved values automatically.
        if (effort === 'none' && options.includes('minimal')) return 'minimal'
        if (effort && options.includes(effort)) return effort

        const fallback = model.defaultReasoning
        if (fallback && options.includes(fallback)) return fallback

        return options[0]
    }

    const activeReasoning = computed(() => {
        const model = activeModel.value
        if (!model?.id) return null
        return normalizeReasoning(reasoningLevels[model.id], model)
    })

    const setReasoning = (effort) => {
        const model = activeModel.value
        if (!model?.id) return

        const normalized = normalizeReasoning(effort, model)
        if (!normalized) return

        reasoningLevels[model.id] = normalized
        persistReasoning()
    }

    const setModel = (key) => {
        if (models.value.some((m) => m.key === key)) {
            currentModelKey.value = key
        }
    }

    const reasoningLabel = (effort) => registry.reasoningLabels[effort] || effort

    return {
        models,
        registry,
        loaded,
        loadError,
        currentModelKey,
        activeModel,
        activeReasoning,
        reasoningOptions,
        supportsReasoning,
        loadModels,
        setModel,
        setReasoning,
        reasoningLabel,
    }
}

export default useModels
