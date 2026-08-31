import axios from 'axios'

import { getModel, DEFAULT_MODEL_KEY, MODELS } from '../config/models.js'
import { SYSTEM_PROMPT } from '../config/systemPrompt.js'
import { sanitizeHistoryForOpenAI } from '../utils/history.js'

const RESPONSES_URL = 'https://api.openai.com/v1/responses'

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

// The system prompt is owned by the server, so a client that omits it (or a
// stored conversation that predates it) still gets one. A client that sends
// its own system message keeps it -- that is how a future per-conversation
// prompt would work without another endpoint.
const withSystemPrompt = (input) => {
    const hasSystem = input.some((item) => item?.role === 'system')
    if (hasSystem) return input

    return [{ role: 'system', content: SYSTEM_PROMPT }, ...input]
}

const buildPayload = ({
    modelKey,
    input,
    reasoning,
    useWebSearch,
    conversationId,
    metadata,
}) => {
    const key = MODELS[modelKey] ? modelKey : DEFAULT_MODEL_KEY
    const cfg = getModel(key)

    const payload = {
        model: cfg.id,
        [cfg.tokenField]: cfg.defaultMax,
        input: withSystemPrompt(sanitizeHistoryForOpenAI(input)),
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

    if (useWebSearch) {
        payload.tools = [{ type: 'web_search' }]
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
        conversationId = null,
        metadata = null,
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
        conversationId,
        metadata,
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
