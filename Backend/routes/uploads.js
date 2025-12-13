const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadFile,
  getUploads,
  getUploadById,
  deleteUpload
} = require('../controllers/uploadController');

// @route   POST /api/uploads
// @desc    Upload file
// @access  Private
router.post(
  '/',
  auth,
  upload.single('file'),
  uploadFile
);

// @route   GET /api/uploads
// @desc    List uploads
// @access  Private
router.get('/', auth, getUploads);

// @route   GET /api/uploads/:id
// @desc    Get upload metadata or download
// @access  Private
router.get('/:id', auth, getUploadById);

// @route   DELETE /api/uploads/:id
// @desc    Delete upload
// @access  Private
router.delete('/:id', auth, deleteUpload);

module.exports = router;
