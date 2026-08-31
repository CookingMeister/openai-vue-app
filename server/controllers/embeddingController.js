import embeddingService from '../services/embeddingService.js'

const createEmbeddings = async (req, res) => {
    try {
        await embeddingService.createEmbeddings(req, res)
    } catch (error) {
        console.error('Embeddings request failed:', error.message)

        if (res.headersSent) {
            res.end()
            return
        }

        res.status(500).json({ error: error.message })
    }
}

export default { createEmbeddings }
