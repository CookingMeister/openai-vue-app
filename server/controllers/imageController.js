import imageService from '../services/imageService.js';

const generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;
    const data = await imageService.generateImage(prompt);
    res.json(data);
  } catch (error) {
    console.error('Image generation error:', error.message, error.response?.data);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
};

const imageProxy = async (req, res) => {
  try {
    await imageService.proxyImage(req, res);
  } catch (error) {
    console.error('Error in proxy server:', error.message);
    res.status(502).send('Failed to fetch the image from the source.');
  }
};

const editImage = async (req, res) => {
  try {
    console.log('Edit image request received:', {
      hasImage: !!req.files?.image,
      hasMask: !!req.files?.mask,
      prompt: req.body.prompt
    });

    if (!req.files?.image?.[0] || !req.files?.mask?.[0]) {
      return res.status(400).json({ error: 'Image and mask are required' });
    }

    const data = await imageService.editImage(
      req.files.image[0],
      req.files.mask[0],
      req.body.prompt
    );

    res.json(data);
  } catch (error) {
    console.error('Image edit controller error:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
};

export default { generateImage, imageProxy, editImage };