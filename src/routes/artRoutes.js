const express = require('express');
const multer = require('multer');
const Artwork = require('../models/Artwork');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// GET /api/artworks — browse, search, filter, sort
router.get('/', async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    const filter = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ title: regex }, { creatorName: regex }];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    let query = Artwork.find(filter);

    if (sort === 'trending') {
      query = query.sort({ votes: -1, createdAt: -1 });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const artworks = await query.exec();
    res.json(artworks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artworks', error: error.message });
  }
});

// GET /api/artworks/:id
router.get('/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }
    res.json(artwork);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch artwork', error: error.message });
  }
});

// POST /api/artworks/upload — passcode-protected upload
router.post('/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('[Upload] Multer error:', err);
      const message =
        err instanceof multer.MulterError ? err.message : err.message || 'File upload failed';
      return res.status(400).json({ message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { title, creatorName, category, description, passcode } = req.body;

    if (passcode !== process.env.UPLOAD_PASSCODE) {
      return res.status(401).json({ message: 'Invalid upload passcode' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    if (!title || !creatorName || !category) {
      return res.status(400).json({ message: 'Title, creator name, and category are required' });
    }

    if (!cloudinary.isConfigured()) {
      console.error('[Upload] Cloudinary is not configured');
      return res.status(500).json({ message: 'Upload service is not configured' });
    }

    const uploadResult = await cloudinary.uploadImageBuffer(req.file.buffer, req.file.mimetype);

    const artwork = await Artwork.create({
      title,
      creatorName,
      category,
      description: description || '',
      imageUrl: uploadResult.secure_url,
      cloudinaryId: uploadResult.public_id,
    });

    res.status(201).json(artwork);
  } catch (error) {
    console.error('[Upload] Failed:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// DELETE /api/artworks/:id — passcode-protected delete
router.delete('/:id', async (req, res) => {
  try {
    const passcode =
      req.body?.passcode ?? req.query.passcode ?? req.headers['x-passcode'];

    if (passcode !== process.env.UPLOAD_PASSCODE) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }

    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    if (artwork.cloudinaryId && cloudinary.isConfigured()) {
      await cloudinary.uploader.destroy(artwork.cloudinaryId);
    }

    await Artwork.findByIdAndDelete(req.params.id);

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', error: error.message });
  }
});

// PATCH /api/artworks/:id/vote
router.patch('/:id/vote', async (req, res) => {
  try {
    const artwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      { $inc: { votes: 1 } },
      { new: true }
    );

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    res.json(artwork);
  } catch (error) {
    res.status(500).json({ message: 'Vote failed', error: error.message });
  }
});

module.exports = router;
