// Model registry ported from the vanilla chatapp script.
//
// `tokenField` is the request key the Responses API expects for the output
// cap; `contextWindow` is the total window the model advertises and is what
// history budgeting measures against -- it is NOT what we actually send. See
// historyTokenCap below.

export const REASONING_STORAGE_KEY = 'chatApp.reasoningLevels'

export const REASONING_LABELS = {
    none: 'None',
    minimal: 'Minimal',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    xhigh: 'X High',
    max: 'Max',
}

export const REASONING_OPTIONS = {
    standard: ['none', 'low', 'medium', 'high'],
    extended: ['none', 'low', 'medium', 'high', 'xhigh'],
    maximum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
    minimal: ['minimal', 'low', 'medium', 'high'],
    lowOnly: ['low', 'medium', 'high'],
}

export const MODELS = {
    o3: {
        id: 'o3',
        label: 'o3',
        order: 1,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 200000,
        reasoningOptions: REASONING_OPTIONS.lowOnly,
        defaultReasoning: 'medium',
    },
    'o3-mini': {
        id: 'o3-mini',
        label: 'o3 mini',
        order: 2,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 200000,
        reasoningOptions: REASONING_OPTIONS.lowOnly,
        defaultReasoning: 'medium',
    },
    '4o': {
        id: 'gpt-4o',
        label: 'GPT - 4o',
        order: 3,
        tokenField: 'max_output_tokens',
        defaultMax: 16384,
        contextWindow: 128000,
    },
    '4.1': {
        id: 'gpt-4.1',
        label: 'GPT - 4.1',
        order: 4,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 128000,
    },
    '4.1-mini': {
        id: 'gpt-4.1-mini',
        label: 'GPT - 4.1 mini',
        order: 5,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 128000,
    },
    '5': {
        id: 'gpt-5',
        label: 'GPT - 5',
        order: 6,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 400000,
        reasoningOptions: REASONING_OPTIONS.minimal,
        defaultReasoning: 'medium',
    },
    '5-mini': {
        id: 'gpt-5-mini',
        label: 'GPT - 5 mini',
        order: 7,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 400000,
        reasoningOptions: REASONING_OPTIONS.minimal,
        defaultReasoning: 'low',
    },
    '5-nano': {
        id: 'gpt-5-nano',
        label: 'GPT - 5 nano',
        order: 8,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 400000,
        reasoningOptions: REASONING_OPTIONS.minimal,
        defaultReasoning: 'low',
    },
    '5.1': {
        id: 'gpt-5.1',
        label: 'GPT - 5.1',
        order: 9,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 400000,
        reasoningOptions: REASONING_OPTIONS.standard,
        defaultReasoning: 'medium',
    },
    '5.2': {
        id: 'gpt-5.2',
        label: 'GPT - 5.2',
        order: 10,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 400000,
        reasoningOptions: REASONING_OPTIONS.extended,
        defaultReasoning: 'medium',
    },
    '5.3': {
        id: 'gpt-5.3-chat-latest',
        label: 'GPT - 5.3',
        order: 11,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 128000,
    },
    '5.4': {
        id: 'gpt-5.4-2026-03-05',
        label: 'GPT - 5.4',
        order: 12,
        tokenField: 'max_output_tokens',
        defaultMax: 64000,
        contextWindow: 1050000,
        reasoningOptions: REASONING_OPTIONS.extended,
        defaultReasoning: 'medium',
    },
    '5.4-mini': {
        id: 'gpt-5.4-mini',
        label: 'GPT - 5.4 mini',
        order: 13,
        tokenField: 'max_output_tokens',
        defaultMax: 64000,
        contextWindow: 400000,
        reasoningOptions: REASONING_OPTIONS.extended,
        defaultReasoning: 'medium',
    },
    '5.4-nano': {
        id: 'gpt-5.4-nano-2026-03-17',
        label: 'GPT - 5.4 nano',
        order: 14,
        tokenField: 'max_output_tokens',
        defaultMax: 32768,
        contextWindow: 400000,
        reasoningOptions: REASONING_OPTIONS.extended,
        defaultReasoning: 'low',
    },
    '5.5': {
        id: 'gpt-5.5',
        label: 'GPT - 5.5',
        order: 15,
        tokenField: 'max_output_tokens',
        defaultMax: 64000,
        contextWindow: 1050000,
        reasoningOptions: REASONING_OPTIONS.extended,
        defaultReasoning: 'medium',
    },
    '5.6-sol': {
        id: 'gpt-5.6-sol',
        label: 'GPT - 5.6 Sol',
        order: 16,
        tokenField: 'max_output_tokens',
        defaultMax: 64000,
        contextWindow: 1050000,
        reasoningOptions: REASONING_OPTIONS.maximum,
        defaultReasoning: 'medium',
    },
    '5.6-terra': {
        id: 'gpt-5.6-terra',
        label: 'GPT - 5.6 Terra',
        order: 17,
        tokenField: 'max_output_tokens',
        defaultMax: 64000,
        contextWindow: 1050000,
        reasoningOptions: REASONING_OPTIONS.maximum,
        defaultReasoning: 'medium',
    },
    '5.6-luna': {
        id: 'gpt-5.6-luna',
        label: 'GPT - 5.6 Luna',
        order: 18,
        tokenField: 'max_output_tokens',
        defaultMax: 64000,
        contextWindow: 1050000,
        reasoningOptions: REASONING_OPTIONS.maximum,
        defaultReasoning: 'medium',
    },
}

export const DEFAULT_MODEL_KEY = '5.6-luna'

// Model used for background conversation-title generation.
export const TITLE_MODEL = 'gpt-5.4-nano'

// Ceiling on how much conversation history we resend per turn. The models
// allow far more (gpt-5 is 400k), but every turn resends the whole array, so
// cost grows with the square of the conversation -- and recall degrades in
// very long contexts. This caps only what is SENT; storage keeps everything.
export const HISTORY_TOKEN_CAP = 100000

// Registry order is authoring order, not display order; sort explicitly.
export const modelsInOrder = () =>
    Object.entries(MODELS)
        .map(([key, model]) => ({ key, ...model }))
        .sort((a, b) => a.order - b.order)

export const getModel = (key) => MODELS[key] || MODELS[DEFAULT_MODEL_KEY]

export const supportsReasoning = (key) =>
    Array.isArray(getModel(key).reasoningOptions)

export default MODELS
