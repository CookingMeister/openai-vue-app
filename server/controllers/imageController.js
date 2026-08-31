import imageService from '../services/imageService.js'

const generateImage = async (req, res) => {
    try {
        const { prompt } = req.body || {}

        if (!prompt?.trim()) {
            return res.status(400).json({ error: 'prompt is required' })
        }

        const data = await imageService.generateImage(prompt)
        res.json(data)
    } catch (error) {
        console.error('Image generation error:', error.message)
        res.status(500).json({ error: error.message })
    }
}

const editImage = async (req, res) => {
    try {
        const image = req.files?.image?.[0]
        const { prompt } = req.body || {}

        if (!image) {
            return res.status(400).json({ error: 'image file is required' })
        }

        if (!prompt?.trim()) {
            return res.status(400).json({ error: 'prompt is required' })
        }

        // Mask is optional under gpt-image-1; when absent the whole frame is
        // reworked, which is what the iterate flow asks for.
        const data = await imageService.editImage(image, prompt, req.files?.mask?.[0] || null)
        res.json(data)
    } catch (error) {
        console.error('Image edit error:', error.message)
        res.status(500).json({ error: error.message })
    }
}

export default { generateImage, editImage }
