import axios from 'axios';

const streamChatCompletion = async (req, res) => {
  const { messages } = req.body;
  const response = await axios({
    method: 'post',
    url: 'https://api.openai.com/v1/chat/completions',
    data: {
      model: 'gpt-4.1',
      messages,
      stream: true,
      max_tokens: 32000,
    },
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    responseType: 'stream',
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  response.data.on('data', (chunk) => res.write(chunk));
  response.data.on('end', () => res.end());
  response.data.on('error', () => res.end());
};

export default { streamChatCompletion };