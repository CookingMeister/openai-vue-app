import titleService from '../services/titleService.js'

const handleGenerateTitle = async (req, res) => {
    try {
        await titleService.generateTitle(req, res)
    } catch (error) {
        console.error('Title generation failed:', error)

        if (res.headersSent) {
            res.end()
            return
        }

        res.status(500).json({ error: error.message })
    }
}

export default { handleGenerateTitle }
