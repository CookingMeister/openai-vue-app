import { ref } from 'vue'

// Responses API streaming client, ported from sections 20 and 23 of the
// vanilla chatapp script.
//
// The original called api.openai.com directly with a key held in the browser.
// Here the same event handling runs against /api/chat, which proxies to the
// Responses API server-side -- the SSE frames are passed through untouched, so
// the event names below are OpenAI's, not ours.

const isAbortLike = (err) =>
    !!err && (err.name === 'AbortError' || /aborted/i.test(String(err.message || '')))

export const createEmptyStats = () => ({
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    rounds: 0,
    genMs: 0,
    model: '',
    firstRoundInput: 0,
    startTime: 0,
    completedAt: 0,
})

export const useChatStream = () => {
    const isStreaming = ref(false)
    const stopping = ref(false)

    let controller = null
    let reader = null

    const stop = async () => {
        if (stopping.value || !isStreaming.value) return
        stopping.value = true

        if (controller) {
            try {
                controller.abort()
            } catch {
                /* already aborted */
            }
        }

        if (reader) {
            try {
                await reader.cancel()
            } catch {
                /* reader already closed */
            }
        }

        stopping.value = false
    }

    // Handles one SSE frame. `state` accumulates text and stats across the
    // whole response; a tool loop can stream several response.completed events
    // and each round is billed separately, so stats add rather than overwrite.
    const handleChunk = (chunk, state, onDelta) => {
        for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue

            const jsonStr = line.slice(6).trim()
            if (!jsonStr || jsonStr === '[DONE]') continue

            let parsed
            try {
                parsed = JSON.parse(jsonStr)
            } catch {
                // A frame can be split across reads; the next pass sees it whole.
                continue
            }

            if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                state.text += parsed.delta
                onDelta?.(state.text, parsed.delta)
                continue
            }

            if (parsed.type === 'response.completed') {
                const usage = parsed.response?.usage
                const stats = state.stats

                if (usage) {
                    // The prompt estimator only ever sizes the first request,
                    // so keep that round's input separate for calibration.
                    if (!stats.rounds) {
                        stats.firstRoundInput = usage.input_tokens ?? 0
                    }

                    stats.inputTokens += usage.input_tokens ?? 0
                    stats.outputTokens += usage.output_tokens ?? 0
                    stats.cachedTokens += usage.input_tokens_details?.cached_tokens ?? 0
                    stats.reasoningTokens += usage.output_tokens_details?.reasoning_tokens ?? 0
                    stats.rounds += 1
                }

                // Model time for this round. Not measured from the first token:
                // reasoning tokens are billed as output but are produced before
                // any delta arrives, so skipping that window would divide
                // reasoning-inclusive output by non-reasoning time.
                if (state.roundStartedAt) {
                    stats.genMs += Date.now() - state.roundStartedAt
                    state.roundStartedAt = Date.now()
                }

                stats.model = parsed.response?.model ?? stats.model
                stats.completedAt = Date.now()

                state.responseId = parsed.response?.id || null

                // A tool round ends with the calls the model wants run. They
                // are executed by the caller (the document index lives in this
                // browser) and their output is sent back on the next round.
                state.functionCalls = (parsed.response?.output || []).filter(
                    (item) => item?.type === 'function_call',
                )
            }
        }
    }

    // Resolves with the accumulated text and stats. An abort is not an error:
    // whatever streamed before the stop is kept and returned with
    // `aborted: true`, matching how the original left partial replies on screen.
    // A tool result can prompt another tool call. Cap the chain so a model
    // that keeps asking cannot spin here indefinitely.
    const MAX_TOOL_ROUNDS = 5

    const send = async ({
        input,
        modelKey,
        reasoning = null,
        useWebSearch = false,
        enableDocumentSearch = false,
        conversationId = null,
        metadata = null,
        onDelta = null,
        onToolCall = null,
        onToolStatus = null,
    }) => {
        const state = {
            text: '',
            responseId: null,
            functionCalls: [],
            roundStartedAt: Date.now(),
            stats: createEmptyStats(),
        }

        state.stats.startTime = Date.now()

        controller = new AbortController()
        isStreaming.value = true

        // Each round after the first continues the previous response, so it
        // carries only the tool output rather than the whole conversation.
        let roundInput = input
        let previousResponseId = null
        let toolRounds = 0

        try {
            for (;;) {
            state.functionCalls = []

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: roundInput,
                    modelKey,
                    reasoning,
                    useWebSearch,
                    enableDocumentSearch,
                    conversationId,
                    metadata,
                    previousResponseId,
                }),
                signal: controller.signal,
            })

            if (!res.ok) {
                // The proxy reports upstream failures as JSON before any SSE
                // body has started, so this is still readable as JSON.
                let message = `Request failed (${res.status})`
                try {
                    const body = await res.json()
                    message = body?.error || message
                } catch {
                    /* non-JSON error body */
                }
                throw new Error(message)
            }

            if (!res.body) throw new Error('Streaming is not supported by this browser')

            reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            for (;;) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Frames are separated by a blank line. Keep the trailing
                // partial in the buffer so a split JSON payload is never parsed
                // half-formed.
                const frames = buffer.split('\n\n')
                buffer = frames.pop() ?? ''

                for (const frame of frames) {
                    handleChunk(frame, state, onDelta)
                }
            }

            if (buffer.trim()) handleChunk(buffer, state, onDelta)

            const calls = state.functionCalls

            // No tool call means the model is done talking.
            if (!calls.length || !onToolCall || toolRounds >= MAX_TOOL_ROUNDS) {
                return {
                    text: state.text,
                    stats: state.stats,
                    responseId: state.responseId,
                    toolRounds,
                    aborted: false,
                }
            }

            toolRounds += 1
            onToolStatus?.(calls)

            // Every call is answered, including ones that throw: a
            // function_call without its output is a malformed round and the
            // API rejects the whole continuation.
            const outputs = []

            for (const call of calls) {
                let output

                try {
                    const args = call.arguments ? JSON.parse(call.arguments) : {}
                    output = await onToolCall(call.name, args)
                } catch (err) {
                    output = { ok: false, error: err.message || 'Tool call failed' }
                }

                outputs.push({
                    type: 'function_call_output',
                    call_id: call.call_id,
                    output: JSON.stringify(output ?? null),
                })
            }

            previousResponseId = state.responseId
            roundInput = outputs
            state.roundStartedAt = Date.now()
            }
        } catch (err) {
            if (isAbortLike(err)) {
                return {
                    text: state.text,
                    stats: state.stats,
                    responseId: state.responseId,
                    toolRounds,
                    aborted: true,
                }
            }
            throw err
        } finally {
            isStreaming.value = false
            controller = null
            reader = null
        }
    }

    return { isStreaming, stopping, send, stop }
}

export default useChatStream
