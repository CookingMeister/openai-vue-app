import chatService from '../services/chatService.js';

const handleChat = async (req, res) => {
  try {
    await chatService.streamChatCompletion(req, res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default { handleChat };