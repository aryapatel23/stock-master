const Product = require('../models/Product');
const StockLocation = require('../models/StockLocation');

// @route   GET /api/products
// @desc    List products with search and filters
// @access  Private
const getProducts = async (req, res) => {
  try {
    const { 
      q, 
      sku, 
      category, 
      low_stock, 
      page = 1, 
      limit = 20, 
      sort = '-createdAt' 
    } = req.query;

    // Build query
    const query = { isDeleted: false };

    // Full-text search on name/description
    if (q) {
      query.$text = { $search: q };
    }

    // SKU filter
    if (sku) {
      query.sku = { $regex: sku, $options: 'i' };
    }

    // Category filter
    if (category) {
      query.categoryId = category;
    }

    // Low stock filter
    if (low_stock === 'true') {
      query.$expr = { $lte: ['$totalOnHand', '$reorderLevel'] };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(query);

    // Execute query with sorting and population
    let sortQuery = {};
    if (sort.startsWith('-')) {
      sortQuery[sort.substring(1)] = -1;
    } else {
      sortQuery[sort] = 1;
    }

    const products = await Product.find(query)
      .populate('categoryId', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortQuery);

    res.json({
      success: true,
      products: products.map(p => p.toPublicJSON()),
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
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// @route   POST /api/products
// @desc    Create new product
// @access  Private
const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      sku, 
      description, 
      categoryId, 
      uom, 
      defaultWarehouseId, 
      attributes,
      reorderLevel,
      price,
      cost
    } = req.body;

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    // Create product
    const product = await Product.create({
      name,
      sku: sku.toUpperCase(),
      description,
      categoryId: categoryId || null,
      uom: uom || 'PCS',
      defaultWarehouseId: defaultWarehouseId || null,
      attributes: attributes ? new Map(Object.entries(attributes)) : new Map(),
      reorderLevel: reorderLevel || 0,
      price: price || 0,
      cost: cost || 0,
      createdBy: req.user._id
    });

    await product.populate('categoryId', 'name');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: product.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// @route   GET /api/products/:productId
// @desc    Get product details with stock summary
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('categoryId', 'name');

    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get stock locations
    const locations = await StockLocation.find({ 
      productId: req.params.productId 
    }).populate('locationId', 'name');

    res.json({
      success: true,
      product: product.toPublicJSON(),
      totalOnHand: product.totalOnHand,
      totalReserved: product.totalReserved,
      locations: locations.map(loc => ({
        locationId: loc.locationId?._id,
        locationName: loc.locationId?.name,
        qty: loc.quantity,
        reserved: loc.reserved,
        available: loc.quantity - loc.reserved
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// @route   PUT /api/products/:productId
// @desc    Update product metadata
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const { 
      name, 
      description, 
      categoryId, 
      uom, 
      defaultWarehouseId, 
      attributes,
      reorderLevel,
      price,
      cost,
      isActive
    } = req.body;

    // Update fields
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (uom !== undefined) product.uom = uom.toUpperCase();
    if (defaultWarehouseId !== undefined) product.defaultWarehouseId = defaultWarehouseId;
    if (attributes !== undefined) product.attributes = new Map(Object.entries(attributes));
    if (reorderLevel !== undefined) product.reorderLevel = reorderLevel;
    if (price !== undefined) product.price = price;
    if (cost !== undefined) product.cost = cost;
    if (isActive !== undefined) product.isActive = isActive;
    
    product.updatedBy = req.user._id;

    await product.save();
    await product.populate('categoryId', 'name');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product: product.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// @route   DELETE /api/products/:productId
// @desc    Soft delete product
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Soft delete
    product.isDeleted = true;
    product.isActive = false;
    product.updatedBy = req.user._id;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// @route   POST /api/products/bulk
// @desc    Bulk create/update products
// @access  Private
const bulkProducts = async (req, res) => {
  try {
    const { products, preview = false } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }

    const results = {
      total: products.length,
      success: 0,
      failed: 0,
      errors: [],
      created: [],
      updated: []
    };

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      
      try {
        // Validate required fields
        if (!item.name || !item.sku) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            sku: item.sku,
            error: 'Name and SKU are required'
          });
          continue;
        }

        const sku = item.sku.toUpperCase();

        if (preview) {
          // Preview mode - just validate
          const existing = await Product.findOne({ sku });
          results.success++;
          if (existing) {
            results.updated.push({ row: i + 1, sku, action: 'update' });
          } else {
            results.created.push({ row: i + 1, sku, action: 'create' });
          }
        } else {
          // Actual import
          const existing = await Product.findOne({ sku });

          if (existing) {
            // Update existing
            if (item.name) existing.name = item.name;
            if (item.description !== undefined) existing.description = item.description;
            if (item.categoryId) existing.categoryId = item.categoryId;
            if (item.uom) existing.uom = item.uom.toUpperCase();
            if (item.reorderLevel !== undefined) existing.reorderLevel = item.reorderLevel;
            if (item.price !== undefined) existing.price = item.price;
            if (item.cost !== undefined) existing.cost = item.cost;
            if (item.attributes) existing.attributes = new Map(Object.entries(item.attributes));
            
            existing.updatedBy = req.user._id;
            await existing.save();
            
            results.updated.push({ row: i + 1, sku });
          } else {
            // Create new
            await Product.create({
              name: item.name,
              sku,
              description: item.description || null,
              categoryId: item.categoryId || null,
              uom: item.uom || 'PCS',
              reorderLevel: item.reorderLevel || 0,
              price: item.price || 0,
              cost: item.cost || 0,
              attributes: item.attributes ? new Map(Object.entries(item.attributes)) : new Map(),
              createdBy: req.user._id
            });
            
            results.created.push({ row: i + 1, sku });
          }
          
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          sku: item.sku,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: preview ? 'Preview completed' : 'Bulk operation completed',
      preview,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing bulk products',
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  bulkProducts
};
