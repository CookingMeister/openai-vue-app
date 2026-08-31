import express from 'express'
import embeddingController from '../controllers/embeddingController.js'

const router = express.Router()

router.post('/', embeddingController.createEmbeddings)

export default router
