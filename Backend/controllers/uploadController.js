const Upload = require('../models/Upload');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// @route   POST /api/uploads
// @desc    Upload file
// @access  Private
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const {
      category,
      description,
      tags,
      isPublic,
      allowedRoles,
      relatedEntityType,
      relatedEntityId,
      expiresAt
    } = req.body;

    // Determine file type
    const fileType = determineFileType(req.file.mimetype);

    // Generate unique filename
    const uniqueFilename = `${crypto.randomBytes(16).toString('hex')}${path.extname(req.file.originalname)}`;
    
    // File URL (for local storage)
    const fileUrl = `/uploads/${uniqueFilename}`;

    // Create upload record
    const upload = await Upload.create({
      filename: uniqueFilename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      storage: {
        provider: 'local',
        path: req.file.path,
        url: fileUrl
      },
      fileType,
      category: category || 'other',
      relatedEntity: relatedEntityType && relatedEntityId ? {
        entityType: relatedEntityType,
        entityId: relatedEntityId
      } : undefined,
      isPublic: isPublic === 'true',
      allowedRoles: allowedRoles ? JSON.parse(allowedRoles) : [],
      description,
      tags: tags ? JSON.parse(tags) : [],
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      uploadedBy: req.user._id,
      scanStatus: 'clean' // In production, integrate virus scanning
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      upload: {
        id: upload._id,
        url: fileUrl,
        filename: upload.originalName,
        size: upload.size,
        mimetype: upload.mimetype,
        fileType: upload.fileType,
        createdAt: upload.createdAt
      }
    });
  } catch (error) {
    // Clean up file if database operation fails
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
};

// @route   GET /api/uploads
// @desc    List uploads
// @access  Private
const getUploads = async (req, res) => {
  try {
    const {
      category,
      fileType,
      relatedEntityType,
      relatedEntityId,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    // Filter by user access
    if (req.user.role !== 'admin') {
      query.$or = [
        { uploadedBy: req.user._id },
        { isPublic: true },
        { allowedUsers: req.user._id },
        { allowedRoles: req.user.role }
      ];
    }

    if (category) query.category = category;
    if (fileType) query.fileType = fileType;
    if (relatedEntityType) query['relatedEntity.entityType'] = relatedEntityType;
    if (relatedEntityId) query['relatedEntity.entityId'] = relatedEntityId;

    const uploads = await Upload.find(query)
      .populate('uploadedBy', 'name email')
      .select('-storage.path') // Don't expose server paths
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Upload.countDocuments(query);

    res.json({
      success: true,
      uploads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching uploads',
      error: error.message
    });
  }
};

// @route   GET /api/uploads/:id
// @desc    Get upload metadata or download
// @access  Private
const getUploadById = async (req, res) => {
  try {
    const { download } = req.query;

    const upload = await Upload.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!upload || upload.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check access permissions
    if (
      req.user.role !== 'admin' &&
      upload.uploadedBy._id.toString() !== req.user._id.toString() &&
      !upload.isPublic &&
      !upload.allowedUsers.includes(req.user._id) &&
      !upload.allowedRoles.includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // If download requested
    if (download === 'true') {
      // Update download stats
      upload.downloadCount++;
      upload.lastDownloadedAt = new Date();
      await upload.save();

      // Send file
      return res.download(upload.storage.path, upload.originalName);
    }

    // Return metadata
    const uploadData = upload.toObject();
    delete uploadData.storage.path; // Don't expose server path

    res.json({
      success: true,
      upload: uploadData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching upload',
      error: error.message
    });
  }
};

// @route   DELETE /api/uploads/:id
// @desc    Delete upload
// @access  Private
const deleteUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload || upload.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions
    if (
      req.user.role !== 'admin' &&
      upload.uploadedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete in database
    upload.isDeleted = true;
    await upload.save();

    // Optionally delete physical file (commented out for safety)
    // try {
    //   await fs.unlink(upload.storage.path);
    // } catch (unlinkError) {
    //   console.error('Error deleting physical file:', unlinkError);
    // }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting upload',
      error: error.message
    });
  }
};

// Helper function to determine file type
function determineFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'pdf';
  if (
    mimetype.includes('spreadsheet') ||
    mimetype.includes('excel') ||
    mimetype.includes('csv')
  ) return 'spreadsheet';
  if (
    mimetype.includes('document') ||
    mimetype.includes('word') ||
    mimetype.includes('text')
  ) return 'document';
  return 'other';
}

module.exports = {
  uploadFile,
  getUploads,
  getUploadById,
  deleteUpload
};
