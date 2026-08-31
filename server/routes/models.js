import express from 'express'
import modelController from '../controllers/modelController.js'

const router = express.Router()

router.get('/', modelController.handleList)

export default router
