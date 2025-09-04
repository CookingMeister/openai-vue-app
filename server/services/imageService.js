import axios from 'axios';
import FormData from 'form-data';

const generateImage = async (prompt) => {
  const response = await axios.post(
    'https://api.openai.com/v1/images/generations',
    {
      model: 'dall-e-2',
      prompt,
      n: 1,
      size: '1024x1024'
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );
  return response.data;
};

const proxyImage = async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).send('Image URL is required');
        }
        
        console.log('Proxying image from:', url);

        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'stream',
            headers: {
                'Accept': 'image/*'
            }
        });

        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(502).send('Failed to fetch image');
    }
};

const editImage = async (image, mask, prompt) => {
  try {
    console.log('Editing image with prompt:', prompt);
    
    const formData = new FormData();
    formData.append('image', image.buffer, { 
      filename: 'image.png',
      contentType: 'image/png'
    });
    formData.append('mask', mask.buffer, { 
      filename: 'mask.png',
      contentType: 'image/png'
    });
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');

    const response = await axios.post(
      'https://api.openai.com/v1/images/edits',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        }
      }
    );

    console.log('OpenAI edit response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Image edit error:', error.response?.data || error.message);
    throw error;
  }
};

export default { generateImage, proxyImage, editImage };