import {
    MODELS,
    DEFAULT_MODEL_KEY,
    HISTORY_TOKEN_CAP,
    REASONING_OPTIONS,
    REASONING_LABELS,
    modelsInOrder,
} from '../config/models.js'
import { SYSTEM_PROMPT } from '../config/systemPrompt.js'
import { estimateTokens } from '../utils/tokens.js'

// The prompt itself stays on the server; the client only needs to know what it
// costs so history budgeting can reserve room for it. Computed once at load --
// the prompt is a module constant and cannot change at runtime.
const SYSTEM_PROMPT_TOKENS = estimateTokens(SYSTEM_PROMPT)

// defaultMax and contextWindow are sent because the client budgets history
// against them (see useTokens.getHistoryTokenBudget). tokenField is not: which
// request key carries the output cap is purely a server concern.
const toClientModel = ({ key, id, label, order, defaultMax, contextWindow, reasoningOptions, defaultReasoning }) => ({
    key,
    id,
    label,
    order,
    defaultMax,
    contextWindow,
    reasoningOptions: reasoningOptions ?? null,
    defaultReasoning: defaultReasoning ?? null,
})

const getRegistry = () => ({
    models: modelsInOrder().map(toClientModel),
    defaultModelKey: DEFAULT_MODEL_KEY,
    historyTokenCap: HISTORY_TOKEN_CAP,
    systemPromptTokens: SYSTEM_PROMPT_TOKENS,
    reasoningLabels: REASONING_LABELS,
    reasoningOptions: REASONING_OPTIONS,
    count: Object.keys(MODELS).length,
})

export default { getRegistry }
