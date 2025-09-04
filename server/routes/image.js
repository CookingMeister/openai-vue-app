import express from 'express';
import imageController from '../controllers/imageController.js';
import multer from 'multer';

const router = express.Router();
const upload = multer();

// Debug logging middleware
router.use((req, res, next) => {
  console.log('Image route hit:', {
    path: req.path,
    method: req.method,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Generate image route
router.post('/generate-image', (req, res, next) => {
  console.log('Generate image route hit with prompt:', req.body.prompt);
  next();
}, imageController.generateImage);

// Edit image route
router.post('/edit-image', 
  (req, res, next) => {
    console.log('Edit image route hit');
    next();
  },
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'mask', maxCount: 1 }
  ]),
  (req, res, next) => {
    if (!req.files?.image?.[0] || !req.files?.mask?.[0]) {
      return res.status(400).json({ error: 'Image and mask files are required' });
    }
    next();
  },
  imageController.editImage
);

// Image proxy route
router.get('/image-proxy', (req, res, next) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  next();
}, imageController.imageProxy);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Image route error:', err);
  res.status(500).json({ 
    error: err.message,
    path: req.path 
  });
});

export default router;