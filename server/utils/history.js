// History sanitizer, ported from section 3 of the vanilla chatapp script.
//
// History carries two kinds of record. Ordinary messages become
// {role, content}. A tool-trace record (role "tool", empty content, a
// `toolTrace` array) expands back into the raw Responses API items it
// recorded, so a later turn can see what the model already looked up instead
// of paying for the same tool round again.
//
// A function_call_output is only valid next to its own function_call, so a
// whole round is stored as ONE record: the trimmer can drop a round entirely
// but can never split a call away from its result.
//
// This runs server-side as well as client-side. The client sanitizes so it can
// measure what it is about to send; the server sanitizes again because a
// request body is untrusted input and a malformed item makes OpenAI reject the
// whole turn with a 400.
export const sanitizeHistoryForOpenAI = (messages = []) => {
    const out = []

    for (const m of messages) {
        if (!m || typeof m !== 'object') continue

        if (Array.isArray(m.toolTrace) && m.toolTrace.length > 0) {
            for (const item of m.toolTrace) {
                if (!item?.call_id) continue

                if (item.type === 'function_call') {
                    out.push({
                        type: 'function_call',
                        call_id: item.call_id,
                        name: item.name,
                        arguments: item.arguments,
                    })
                } else if (item.type === 'function_call_output') {
                    out.push({
                        type: 'function_call_output',
                        call_id: item.call_id,
                        output: item.output,
                    })
                }
            }

            continue
        }

        if (typeof m.role !== 'string' || typeof m.content !== 'string') continue

        // A trace record whose items did not survive storage has nothing to say.
        if (m.role === 'tool') continue

        out.push({ role: m.role, content: m.content })
    }

    return out
}

export default sanitizeHistoryForOpenAI
