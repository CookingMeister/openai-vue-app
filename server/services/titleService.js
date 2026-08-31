import axios from 'axios'

import { TITLE_MODEL } from '../config/models.js'

const RESPONSES_URL = 'https://api.openai.com/v1/responses'

// Conversation titles, ported from the vanilla chatapp script. The original
// called api.openai.com from the browser; here it runs server-side like every
// other model call.

// Deviates from the source, which stripped markdown markers only from the
// front and so left "**Bold Title**" as "Bold Title**" in the sidebar. Handled
// here rather than with a trailing [...]+$ regex for the reason below.
const TITLE_TRIM_CHARS = new Set(['"', "'", '`', ' ', '*', '#'])

// Strips wrapping quotes/spaces with an index walk instead of a regex: an
// unanchored `[...]+$` has to retry at every position, so it degrades to
// quadratic time on long inputs.
const trimWrappingQuotes = (text) => {
    let start = 0
    let end = text.length

    while (start < end && TITLE_TRIM_CHARS.has(text[start])) start++
    while (end > start && TITLE_TRIM_CHARS.has(text[end - 1])) end--

    return text.slice(start, end)
}

export const cleanGeneratedTitle = (title) => {
    // Collapse first so the trim above only ever sees single spaces.
    const collapsed = String(title || '')
        .replace(/\s+/g, ' ')
        .trim()

    return trimWrappingQuotes(collapsed)
        .replace(/^[#*\-:\d.\s]+/, '')
        .trim()
        .slice(0, 80)
}

// A Responses payload can carry the text at the top level or nested inside
// output items, depending on model and verbosity; accept either.
const extractResponseText = (data) => {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) {
        return data.output_text.trim()
    }

    const parts = []

    for (const item of data?.output || []) {
        if (item?.type !== 'message') continue

        for (const content of item.content || []) {
            if ((content?.type === 'output_text' || content?.type === 'text') && content?.text) {
                parts.push(content.text)
            }
        }
    }

    return parts.join('\n').trim()
}

const generateTitle = async (req, res) => {
    const { question = '', answer = '' } = req.body || {}

    if (!question.trim()) {
        res.status(400).json({ error: 'question is required' })
        return
    }

    if (!process.env.OPENAI_API_KEY) {
        res.status(500).json({ error: 'OPENAI_API_KEY is not configured' })
        return
    }

    // Truncated hard: a title only needs the gist, and the whole point of this
    // call is that it stays far cheaper than the conversation it names.
    const shortQuestion = question.replace(/\s+/g, ' ').trim().slice(0, 160)
    const shortAnswer = answer.replace(/\s+/g, ' ').trim().slice(0, 320)

    const payload = {
        model: TITLE_MODEL,
        max_output_tokens: 456,
        reasoning: { effort: 'none' },
        text: { verbosity: 'low' },
        metadata: {
            type: 'title_generation',
            source: 'sidebar_title',
        },
        input: [
            {
                role: 'system',
                content:
                    'Create a short chat title from the question and answer. Return title only. No quotes. Maximum 6 words.',
            },
            {
                role: 'user',
                content: `Question: ${shortQuestion}\nAnswer: ${shortAnswer}`,
            },
        ],
    }

    const response = await axios.post(RESPONSES_URL, payload, {
        headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        validateStatus: () => true,
    })

    if (response.status >= 400) {
        res.status(response.status).json({
            error: response.data?.error?.message || `Title request failed (${response.status})`,
        })
        return
    }

    const title = cleanGeneratedTitle(extractResponseText(response.data))

    if (!title) {
        res.status(502).json({ error: 'Model returned no usable title' })
        return
    }

    res.json({ title })
}

export default { generateTitle, cleanGeneratedTitle }
