import express from 'express'
import multer from 'multer'

import imageController from '../controllers/imageController.js'

const router = express.Router()

// In-memory: the buffers are forwarded straight to OpenAI and never touch disk.
const upload = multer({ limits: { fileSize: 25 * 1024 * 1024 } })

router.post('/generate-image', imageController.generateImage)

router.post(
    '/edit-image',
    upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'mask', maxCount: 1 },
    ]),
    imageController.editImage,
)

// The /image-proxy route was removed with the dall-e migration. It existed
// only to fetch dall-e's expiring remote urls on the client's behalf;
// gpt-image returns bytes inline, so nothing needs it -- and an unauthenticated
// server-side fetcher for arbitrary urls is worth not leaving lying around.

router.use((err, req, res, next) => {
    console.error('Image route error:', err)
    res.status(500).json({ error: err.message, path: req.path })
})

export default router
