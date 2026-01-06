const express = require('express');
const multer = require('multer');
const path = require('path');
const contentExtractor = require('../services/contentExtractor');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed: PDF, Images (JPEG, PNG, GIF, WebP), Text files'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload and extract content from file
router.post('/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log(`📄 Processing file: ${req.file.originalname}`);
    
    const extractedContent = await contentExtractor.extractFromFile(req.file);
    
    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        content: extractedContent,
        contentLength: extractedContent.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Extract content from plain text
router.post('/text', async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No text content provided'
      });
    }

    res.json({
      success: true,
      data: {
        content: text.trim(),
        contentLength: text.trim().length
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
