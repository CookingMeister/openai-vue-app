import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.js';
import imageRoutes from './routes/image.js';
import modelRoutes from './routes/models.js';
import titleRoutes from './routes/title.js';
import embeddingRoutes from './routes/embeddings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
// The default 100kb cap is far too small here: the history budget alone allows
// ~100k tokens, and an embedding batch of 64 prose chunks clears it easily.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Route registration
app.use('/api/chat', chatRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/title', titleRoutes);
app.use('/api/embeddings', embeddingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ Backend proxy server running on http://localhost:${PORT}`);
});