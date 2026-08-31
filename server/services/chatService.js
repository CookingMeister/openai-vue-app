import axios from 'axios'

import { getModel, DEFAULT_MODEL_KEY, MODELS } from '../config/models.js'
import { SYSTEM_PROMPT } from '../config/systemPrompt.js'
import { CONTEXT_INSTRUCTIONS } from '../config/contextInstructions.js'
import { sanitizeHistoryForOpenAI } from '../utils/history.js'

const RESPONSES_URL = 'https://api.openai.com/v1/responses'

// The document index lives in the browser's IndexedDB, so this tool cannot be
// executed here. The definition is declared server-side (the client must not
// get to invent tools), the model's call is streamed back, and the client runs
// the search and returns the output on a follow-up request.
const SEARCH_DOCUMENTS_TOOL = {
    type: 'function',
    name: 'search_documents',
    description:
        "Searches the user's own uploaded and embedded documents by meaning, not keywords, and returns the matching passages with their source file, chunk index and similarity score. The most relevant passages for the user's message are usually already supplied as context, so reach for this when that context is thin, absent, or does not answer the question -- and search again with different wording if the first attempt returns nothing. Returns `found` (how many passages matched), `snippets` (their citations) and `context` (the passage text). A `found` of 0 with a `note` means the search ran fine and simply matched nothing; read the note before retrying. Results are the top-k most similar passages, not an exhaustive scan -- absence from results does not prove absence from the document, so say that rather than asserting something is not present. Searches only what the user has embedded and enabled -- it cannot reach the public internet or any file the user has not added.",
    parameters: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description:
                    'What to look for, phrased as the meaning you want to find rather than bare keywords.',
            },
            sources: {
                type: ['array', 'null'],
                items: { type: 'string' },
                description:
                    'File names to restrict the search to, or null to search everything the user has enabled.',
            },
            top_k: {
                type: ['integer', 'null'],
                description: 'How many passages to return (1-20), or null for the configured default.',
            },
        },
        required: ['query', 'sources', 'top_k'],
        additionalProperties: false,
    },
    strict: true,
}

// The client picks a reasoning effort, but it does not get to decide whether
// the model accepts one. Sending `reasoning` to a model without reasoning
// options is a 400, and sending an effort outside the model's own list is a
// 400 too -- so the level is re-validated here against the same registry the
// client read, and silently dropped if it does not belong.
const resolveReasoning = (modelKey, requested) => {
    const options = getModel(modelKey).reasoningOptions

    if (!Array.isArray(options) || options.length === 0) return null

    // Migrate old saved values automatically, matching the client.
    if (requested === 'none' && options.includes('minimal')) return 'minimal'
    if (requested && options.includes(requested)) return requested

    const fallback = getModel(modelKey).defaultReasoning
    if (fallback && options.includes(fallback)) return fallback

    return options[0]
}

// Assembles the final input: system prompt, history, then the retrieved
// context, then the user's current message.
//
// Order matters for prompt caching. Everything stable goes first so the cached
// prefix survives from turn to turn; the doc/RAG block changes every turn and
// would invalidate the cache for anything placed after it. The current prompt
// is held back so it sits directly beside the context that was retrieved for
// it.
//
// This runs server-side rather than in the client because the system prompt
// does: a client-injected system message would otherwise have to suppress the
// real one, and getting that wrong silently drops the app's entire persona.
const buildInput = (input, { docContext = '', docName = '', ragContext = '' } = {}) => {
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }]

    const hasDoc = !!docContext.trim()
    const hasRag = !!ragContext.trim()

    const history = [...input]

    // Hold back the trailing user turn, if that is what it is.
    const tail =
        history.length && history[history.length - 1]?.role === 'user' ? history.pop() : null

    messages.push(...history)

    if (hasDoc || hasRag) {
        let citationInstructions = CONTEXT_INSTRUCTIONS.base

        if (hasDoc && hasRag) {
            citationInstructions += `\n${CONTEXT_INSTRUCTIONS.hybrid}`
        } else if (hasDoc) {
            citationInstructions += `\n${CONTEXT_INSTRUCTIONS.docOnly}`
        } else {
            citationInstructions += `\n${CONTEXT_INSTRUCTIONS.ragOnly}`
        }

        messages.push({ role: 'system', content: citationInstructions })

        let contextContent = ''

        if (hasDoc) {
            contextContent += `### Uploaded Document (Background Context):
**File:** ${docName || 'Document'}

${docContext}

`
        }

        if (hasRag) {
            contextContent += `### Retrieved Snippets (Ranked by Relevance, from Vector Database):
${ragContext}
`
        }

        messages.push({ role: 'system', content: contextContent })
    }

    if (tail) messages.push(tail)

    return messages
}

const buildPayload = ({
    modelKey,
    input,
    reasoning,
    useWebSearch,
    enableDocumentSearch = false,
    conversationId,
    metadata,
    previousResponseId = null,
    docContext = '',
    docName = '',
    ragContext = '',
}) => {
    const key = MODELS[modelKey] ? modelKey : DEFAULT_MODEL_KEY
    const cfg = getModel(key)

    // A continuation round sends raw function_call_output items, which are not
    // conversation messages: sanitizing them away or prepending a second system
    // prompt would both break the round.
    const resolvedInput = previousResponseId
        ? input
        : buildInput(sanitizeHistoryForOpenAI(input), { docContext, docName, ragContext })

    const payload = {
        model: cfg.id,
        [cfg.tokenField]: cfg.defaultMax,
        input: resolvedInput,
        stream: true,
    }

    const effort = resolveReasoning(key, reasoning)
    if (effort) {
        payload.reasoning = { effort }
    }

    // Routes repeat turns of the same conversation to the same prompt cache,
    // which is what makes a stable history prefix actually pay off.
    if (conversationId) {
        payload.prompt_cache_key = String(conversationId)
    }

    // A tool round continues an existing response: the model already holds the
    // context, so `input` carries only the function_call_output items.
    if (previousResponseId) {
        payload.previous_response_id = previousResponseId
    }

    const tools = []

    if (useWebSearch) {
        tools.push({ type: 'web_search' })
    }

    // Only advertised when the user actually has something embedded; offering
    // a search over an empty index just invites the model to call it and be
    // told there is nothing there.
    if (enableDocumentSearch) {
        tools.push(SEARCH_DOCUMENTS_TOOL)
    }

    if (tools.length > 0) {
        payload.tools = tools
        payload.tool_choice = 'auto'
    }

    if (metadata) {
        payload.metadata = {
            type: metadata.type || 'default',
            hasDoc: String(!!metadata.hasDoc),
            hasRag: String(!!metadata.hasRag),
        }
    }

    return payload
}

const streamChatCompletion = async (req, res) => {
    const {
        modelKey = DEFAULT_MODEL_KEY,
        input = [],
        messages,
        reasoning = null,
        useWebSearch = false,
        enableDocumentSearch = false,
        conversationId = null,
        metadata = null,
        previousResponseId = null,
        docContext = '',
        docName = '',
        ragContext = '',
    } = req.body || {}

    // `messages` is what the pre-Responses frontend sent; accept it so an old
    // client still works against this endpoint.
    const history = Array.isArray(input) && input.length ? input : messages || []

    if (!Array.isArray(history) || history.length === 0) {
        res.status(400).json({ error: 'input must be a non-empty array' })
        return
    }

    if (!process.env.OPENAI_API_KEY) {
        res.status(500).json({ error: 'OPENAI_API_KEY is not configured' })
        return
    }

    const payload = buildPayload({
        modelKey,
        input: history,
        reasoning,
        useWebSearch,
        enableDocumentSearch,
        conversationId,
        metadata,
        previousResponseId,
        docContext,
        docName,
        ragContext,
    })

    // The browser aborts by dropping the connection. Without this the upstream
    // request keeps streaming into a dead socket and we keep paying for tokens
    // nobody will ever see.
    const controller = new AbortController()
    let clientGone = false

    const onClose = () => {
        clientGone = true
        controller.abort()
    }

    res.on('close', onClose)

    try {
        const response = await axios({
            method: 'post',
            url: RESPONSES_URL,
            data: payload,
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            responseType: 'stream',
            signal: controller.signal,
            // Read errors ourselves instead of letting axios throw on a stream
            // we cannot inspect.
            validateStatus: () => true,
        })

        if (response.status >= 400) {
            const body = await readStream(response.data)
            res.removeListener('close', onClose)
            res.status(response.status).json({
                error: parseUpstreamError(body, response.status),
            })
            return
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        // Without this an nginx or similar in front of the app buffers the
        // whole stream and the client sees one burst at the end.
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders?.()

        response.data.on('data', (chunk) => res.write(chunk))
        response.data.on('end', () => res.end())
        response.data.on('error', (err) => {
            if (!clientGone) {
                console.error('Upstream stream error:', err.message)
            }
            res.end()
        })
    } catch (err) {
        res.removeListener('close', onClose)

        // An abort here is the client hanging up, not a failure.
        if (clientGone || err.name === 'CanceledError' || err.name === 'AbortError') {
            res.end()
            return
        }

        throw err
    }
}

const readStream = (stream) =>
    new Promise((resolve) => {
        let data = ''
        stream.on('data', (chunk) => {
            data += chunk.toString()
        })
        stream.on('end', () => resolve(data))
        stream.on('error', () => resolve(data))
    })

const parseUpstreamError = (body, status) => {
    try {
        return JSON.parse(body)?.error?.message || `OpenAI request failed (${status})`
    } catch {
        return body?.slice(0, 500) || `OpenAI request failed (${status})`
    }
}

export default { streamChatCompletion, buildPayload, resolveReasoning }
