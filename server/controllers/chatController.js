import chatService from '../services/chatService.js'

const handleChat = async (req, res) => {
    try {
        await chatService.streamChatCompletion(req, res)
    } catch (error) {
        console.error('Chat request failed:', error)

        // Once the SSE body has started, status and JSON are no longer
        // available -- the client is mid-stream and reads headers it already
        // has. All we can do is close and let its reader finish.
        if (res.headersSent) {
            res.end()
            return
        }

        res.status(500).json({ error: error.message })
    }
}

export default { handleChat }
