import axios from 'axios'

const EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings'

export const EMBEDDING_MODEL = 'text-embedding-3-small'

// How many chunks the client may embed in one request. The model's own cap is
// higher, but a batch of 32 keeps each request small enough to retry cheaply
// and matches the client's batching.
const MAX_BATCH = 64

const createEmbeddings = async (req, res) => {
    const { input } = req.body || {}

    const texts = Array.isArray(input) ? input : input ? [input] : []

    if (!texts.length) {
        res.status(400).json({ error: 'input must be a non-empty string or array of strings' })
        return
    }

    if (texts.length > MAX_BATCH) {
        res.status(400).json({ error: `input may not exceed ${MAX_BATCH} items per request` })
        return
    }

    if (texts.some((t) => typeof t !== 'string' || !t.trim())) {
        res.status(400).json({ error: 'every input item must be a non-empty string' })
        return
    }

    if (!process.env.OPENAI_API_KEY) {
        res.status(500).json({ error: 'OPENAI_API_KEY is not configured' })
        return
    }

    const response = await axios.post(
        EMBEDDINGS_URL,
        { model: EMBEDDING_MODEL, input: texts },
        {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            validateStatus: () => true,
            // A 64-chunk batch of prose is comfortably past the default cap.
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        },
    )

    if (response.status >= 400) {
        res.status(response.status).json({
            error: response.data?.error?.message || `Embeddings request failed (${response.status})`,
        })
        return
    }

    const data = response.data?.data

    if (!Array.isArray(data)) {
        res.status(502).json({ error: 'Unexpected embeddings response' })
        return
    }

    // Returned in request order by the API, but sort by index anyway -- the
    // client pairs these positionally with its chunks, so a reordering would
    // silently attach every vector to the wrong text.
    const embeddings = [...data]
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .map((d) => d.embedding)

    res.json({
        model: EMBEDDING_MODEL,
        embeddings,
        usage: response.data?.usage || null,
    })
}

export default { createEmbeddings, EMBEDDING_MODEL, MAX_BATCH }
