const Warehouse = require('../models/Warehouse');
const Location = require('../models/Location');
const StockLocation = require('../models/StockLocation');

// @route   GET /api/warehouses
// @desc    List all warehouses
// @access  Private
const getWarehouses = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    // Build query
    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Warehouse.countDocuments(query);

    const warehouses = await Warehouse.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ isDefault: -1, name: 1 });

    res.json({
      success: true,
      data: warehouses.map(w => w.toPublicJSON()),
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching warehouses',
      error: error.message
    });
  }
};

// @route   POST /api/warehouses
// @desc    Create new warehouse
// @access  Private
const createWarehouse = async (req, res) => {
  try {
    const { name, address, contact, isDefault } = req.body;

    // Check if warehouse with same name exists
    const existing = await Warehouse.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse with this name already exists'
      });
    }

    // If this is set as default, unset others
    if (isDefault) {
      await Warehouse.updateMany({}, { isDefault: false });
    }

    const warehouse = await Warehouse.create({
      name,
      address: address || {},
      contact: contact || {},
      isDefault: isDefault || false,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating warehouse',
      error: error.message
    });
  }
};

// @route   GET /api/warehouses/:id
// @desc    Get warehouse details with stock summary
// @access  Private
const getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Get stock summary for this warehouse
    const stockSummary = await StockLocation.aggregate([
      {
        $match: { locationId: warehouse._id }
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalReserved: { $sum: '$reserved' }
        }
      }
    ]);

    // Get location count
    const locationCount = await Location.countDocuments({
      warehouseId: warehouse._id,
      isDeleted: false
    });

    res.json({
      success: true,
      data: {
        ...warehouse.toPublicJSON(),
        summary: {
          locationCount,
          totalProducts: stockSummary[0]?.totalProducts || 0,
          totalQuantity: stockSummary[0]?.totalQuantity || 0,
          totalReserved: stockSummary[0]?.totalReserved || 0,
          available: (stockSummary[0]?.totalQuantity || 0) - (stockSummary[0]?.totalReserved || 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching warehouse',
      error: error.message
    });
  }
};

// @route   PUT /api/warehouses/:id
// @desc    Update warehouse
// @access  Private
const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const { name, address, contact, isDefault, isActive } = req.body;

    // If setting as default, unset others
    if (isDefault && !warehouse.isDefault) {
      await Warehouse.updateMany({ _id: { $ne: warehouse._id } }, { isDefault: false });
    }

    if (name !== undefined) warehouse.name = name;
    if (address !== undefined) warehouse.address = address;
    if (contact !== undefined) warehouse.contact = contact;
    if (isDefault !== undefined) warehouse.isDefault = isDefault;
    if (isActive !== undefined) warehouse.isActive = isActive;
    
    warehouse.updatedBy = req.user._id;

    await warehouse.save();

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: warehouse.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating warehouse',
      error: error.message
    });
  }
};

// @route   DELETE /api/warehouses/:id
// @desc    Soft delete warehouse
// @access  Private
const deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Check if warehouse has stock
    const hasStock = await StockLocation.findOne({ locationId: warehouse._id });
    if (hasStock) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete warehouse with existing stock. Please transfer stock first.'
      });
    }

    warehouse.isDeleted = true;
    warehouse.isActive = false;
    warehouse.updatedBy = req.user._id;
    await warehouse.save();

    res.json({
      success: true,
      message: 'Warehouse deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting warehouse',
      error: error.message
    });
  }
};

// @route   GET /api/warehouses/:id/locations
// @desc    List locations in a warehouse
// @access  Private
const getWarehouseLocations = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const { page = 1, limit = 50 } = req.query;

    const query = {
      warehouseId: req.params.id,
      isDeleted: false
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Location.countDocuments(query);

    const locations = await Location.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ code: 1 });

    res.json({
      success: true,
      locations: locations.map(loc => loc.toPublicJSON()),
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching locations',
      error: error.message
    });
  }
};

// @route   POST /api/warehouses/:id/locations
// @desc    Create location in warehouse
// @access  Private
const createLocation = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const { code, type, capacity } = req.body;

    // Check if location code exists in this warehouse
    const existing = await Location.findOne({
      warehouseId: req.params.id,
      code: code.toUpperCase()
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Location code already exists in this warehouse'
      });
    }

    const location = await Location.create({
      warehouseId: req.params.id,
      code: code.toUpperCase(),
      type: type || 'rack',
      capacity: capacity || 0,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      location: location.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating location',
      error: error.message
    });
  }
};

module.exports = {
  getWarehouses,
  createWarehouse,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseLocations,
  createLocation
};
