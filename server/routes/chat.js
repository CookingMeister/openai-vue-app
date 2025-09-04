import express from 'express';
import chatController from '../controllers/chatController.js';

const router = express.Router();

router.post('/', (req, res, next) => {
  console.log('Chat route hit:', req.body);
  next();
}, chatController.handleChat);

export default router;