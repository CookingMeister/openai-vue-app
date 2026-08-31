import express from 'express'
import titleController from '../controllers/titleController.js'

const router = express.Router()

router.post('/', titleController.handleGenerateTitle)

export default router
