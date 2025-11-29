const Location = require('../models/Location');
const StockLocation = require('../models/StockLocation');

// @route   GET /api/locations/:locationId
// @desc    Get location details
// @access  Private
const getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.locationId)
      .populate('warehouseId', 'name');

    if (!location || location.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      location: {
        ...location.toPublicJSON(),
        warehouseName: location.warehouseId?.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching location',
      error: error.message
    });
  }
};

// @route   PUT /api/locations/:locationId
// @desc    Update location
// @access  Private
const updateLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.locationId);

    if (!location || location.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    const { code, type, capacity, isActive } = req.body;

    // If code is being changed, check for duplicates
    if (code && code.toUpperCase() !== location.code) {
      const existing = await Location.findOne({
        warehouseId: location.warehouseId,
        code: code.toUpperCase(),
        _id: { $ne: location._id }
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Location code already exists in this warehouse'
        });
      }
      location.code = code.toUpperCase();
    }

    if (type !== undefined) location.type = type;
    if (capacity !== undefined) {
      // Check if new capacity is less than current quantity
      if (capacity < location.currentQty) {
        return res.status(400).json({
          success: false,
          message: `Capacity cannot be less than current quantity (${location.currentQty})`
        });
      }
      location.capacity = capacity;
    }
    if (isActive !== undefined) location.isActive = isActive;
    
    location.updatedBy = req.user._id;

    await location.save();

    res.json({
      success: true,
      message: 'Location updated successfully',
      location: location.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location',
      error: error.message
    });
  }
};

// @route   DELETE /api/locations/:locationId
// @desc    Soft delete location
// @access  Private
const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.locationId);

    if (!location || location.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if location has stock
    if (location.currentQty > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete location with existing stock. Please move stock first.'
      });
    }

    location.isDeleted = true;
    location.isActive = false;
    location.updatedBy = req.user._id;
    await location.save();

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting location',
      error: error.message
    });
  }
};

module.exports = {
  getLocationById,
  updateLocation,
  deleteLocation
};
