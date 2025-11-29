const Category = require('../models/Category');

// @route   GET /api/categories
// @desc    List all categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    // Build query
    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Category.countDocuments(query);

    const categories = await Category.find(query)
      .populate('parentId', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ name: 1 });

    res.json({
      success: true,
      categories: categories.map(cat => ({
        id: cat._id,
        name: cat.name,
        description: cat.description,
        parentId: cat.parentId?._id,
        parentName: cat.parentId?.name,
        isActive: cat.isActive,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt
      })),
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
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @route   POST /api/categories
// @desc    Create new category
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { name, description, parentId } = req.body;

    // Check if category with same name exists
    const existing = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Validate parent if provided
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) {
        return res.status(400).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    const category = await Category.create({
      name,
      description: description || null,
      parentId: parentId || null
    });

    await category.populate('parentId', 'name');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        parentId: category.parentId?._id,
        parentName: category.parentId?.name,
        isActive: category.isActive,
        createdAt: category.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// @route   GET /api/categories/:id
// @desc    Get category by ID
// @access  Private
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentId', 'name');

    if (!category || category.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        parentId: category.parentId?._id,
        parentName: category.parentId?.name,
        isActive: category.isActive,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// @route   PUT /api/categories/:id
// @desc    Update category
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const { name, description, parentId, isActive } = req.body;

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (parentId !== undefined) category.parentId = parentId;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    await category.populate('parentId', 'name');

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        parentId: category.parentId?._id,
        parentName: category.parentId?.name,
        isActive: category.isActive,
        updatedAt: category.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// @route   DELETE /api/categories/:id
// @desc    Soft delete category
// @access  Private
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    category.isDeleted = true;
    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory
};
