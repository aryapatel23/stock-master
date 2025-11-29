const PickingTask = require('../models/PickingTask');
const PackingTask = require('../models/PackingTask');
const DeliveryOrder = require('../models/DeliveryOrder');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');

// @route   GET /api/tasks/picking
// @desc    List picking tasks with filters
// @access  Private
const getPickingTasks = async (req, res) => {
  try {
    const {
      userId,
      warehouseId,
      status,
      priority,
      deliveryOrderId,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (userId) {
      query.assignedTo = userId;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (deliveryOrderId) {
      query.deliveryOrderId = deliveryOrderId;
    }

    const tasks = await PickingTask.find(query)
      .populate('deliveryOrderId', 'orderNumber customerName status')
      .populate('warehouseId', 'name code')
      .populate('assignedTo', 'name email')
      .populate('lines.productId', 'name sku uom')
      .populate('lines.locationId', 'code type')
      .populate('createdBy', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await PickingTask.countDocuments(query);

    res.json({
      success: true,
      tasks,
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
      message: 'Error fetching picking tasks',
      error: error.message
    });
  }
};

// @route   POST /api/tasks/picking/:taskId/start
// @desc    Start picking task
// @access  Private
const startPickingTask = async (req, res) => {
  try {
    const task = await PickingTask.findById(req.params.taskId);

    if (!task || task.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Picking task not found'
      });
    }

    if (!task.canStart()) {
      return res.status(400).json({
        success: false,
        message: `Cannot start task in ${task.status} status`
      });
    }

    task.status = 'in_progress';
    task.startedAt = new Date();
    
    // Optionally assign to current user if not already assigned
    if (!task.assignedTo) {
      task.assignedTo = req.user._id;
    }

    await task.save();

    res.json({
      success: true,
      message: 'Picking task started successfully',
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting picking task',
      error: error.message
    });
  }
};

// @route   POST /api/tasks/picking/:taskId/complete
// @desc    Complete picking task with scanned items
// @access  Private
const completePickingTask = async (req, res) => {
  try {
    const { pickedLines, notes } = req.body;

    const task = await PickingTask.findById(req.params.taskId);

    if (!task || task.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Picking task not found'
      });
    }

    if (!task.canComplete()) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete task in ${task.status} status`
      });
    }

    // Update picked quantities
    for (const pickedLine of pickedLines) {
      const taskLine = task.lines.id(pickedLine.lineId);
      if (taskLine) {
        taskLine.pickedQty = pickedLine.pickedQty;
        if (pickedLine.notes) {
          taskLine.notes = pickedLine.notes;
        }
      }
    }

    // Update delivery order with picked quantities
    const deliveryOrder = await DeliveryOrder.findById(task.deliveryOrderId);
    if (deliveryOrder) {
      for (const taskLine of task.lines) {
        const doLine = deliveryOrder.lines.find(
          line => line.productId.toString() === taskLine.productId.toString()
        );
        if (doLine) {
          doLine.pickedQty = (doLine.pickedQty || 0) + taskLine.pickedQty;
        }
      }
      await deliveryOrder.save();
    }

    task.status = 'completed';
    task.completedAt = new Date();
    if (notes) {
      task.notes = notes;
    }

    await task.save();

    res.json({
      success: true,
      message: 'Picking task completed successfully',
      task,
      summary: {
        taskNumber: task.taskNumber,
        totalRequestedQty: task.totalRequestedQty,
        totalPickedQty: task.totalPickedQty,
        completedAt: task.completedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing picking task',
      error: error.message
    });
  }
};

// @route   GET /api/tasks/packing
// @desc    List packing tasks with filters
// @access  Private
const getPackingTasks = async (req, res) => {
  try {
    const {
      userId,
      warehouseId,
      status,
      priority,
      deliveryOrderId,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (userId) {
      query.assignedTo = userId;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (deliveryOrderId) {
      query.deliveryOrderId = deliveryOrderId;
    }

    const tasks = await PackingTask.find(query)
      .populate('deliveryOrderId', 'orderNumber customerName status')
      .populate('pickingTaskId', 'taskNumber status')
      .populate('warehouseId', 'name code')
      .populate('assignedTo', 'name email')
      .populate('lines.productId', 'name sku uom')
      .populate('createdBy', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await PackingTask.countDocuments(query);

    res.json({
      success: true,
      tasks,
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
      message: 'Error fetching packing tasks',
      error: error.message
    });
  }
};

// @route   POST /api/tasks/packing/:taskId/start
// @desc    Start packing task
// @access  Private
const startPackingTask = async (req, res) => {
  try {
    const task = await PackingTask.findById(req.params.taskId);

    if (!task || task.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Packing task not found'
      });
    }

    if (!task.canStart()) {
      return res.status(400).json({
        success: false,
        message: `Cannot start task in ${task.status} status`
      });
    }

    task.status = 'in_progress';
    task.startedAt = new Date();
    
    // Optionally assign to current user if not already assigned
    if (!task.assignedTo) {
      task.assignedTo = req.user._id;
    }

    await task.save();

    res.json({
      success: true,
      message: 'Packing task started successfully',
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error starting packing task',
      error: error.message
    });
  }
};

// @route   POST /api/tasks/packing/:taskId/complete
// @desc    Complete packing task
// @access  Private
const completePackingTask = async (req, res) => {
  try {
    const { packedLines, numberOfBoxes, totalWeight, notes } = req.body;

    const task = await PackingTask.findById(req.params.taskId);

    if (!task || task.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Packing task not found'
      });
    }

    if (!task.canComplete()) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete task in ${task.status} status`
      });
    }

    // Update packed quantities
    for (const packedLine of packedLines) {
      const taskLine = task.lines.id(packedLine.lineId);
      if (taskLine) {
        taskLine.packedQty = packedLine.packedQty;
        if (packedLine.notes) {
          taskLine.notes = packedLine.notes;
        }
      }
    }

    // Update delivery order with packed quantities
    const deliveryOrder = await DeliveryOrder.findById(task.deliveryOrderId);
    if (deliveryOrder) {
      for (const taskLine of task.lines) {
        const doLine = deliveryOrder.lines.find(
          line => line.productId.toString() === taskLine.productId.toString()
        );
        if (doLine) {
          doLine.packedQty = (doLine.packedQty || 0) + taskLine.packedQty;
        }
      }
      await deliveryOrder.save();
    }

    task.status = 'completed';
    task.completedAt = new Date();
    if (numberOfBoxes) task.numberOfBoxes = numberOfBoxes;
    if (totalWeight) task.totalWeight = totalWeight;
    if (notes) task.notes = notes;

    await task.save();

    res.json({
      success: true,
      message: 'Packing task completed successfully',
      task,
      summary: {
        taskNumber: task.taskNumber,
        totalRequestedQty: task.totalRequestedQty,
        totalPackedQty: task.totalPackedQty,
        numberOfBoxes: task.numberOfBoxes,
        totalWeight: task.totalWeight,
        completedAt: task.completedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error completing packing task',
      error: error.message
    });
  }
};

// @route   POST /api/tasks/picking
// @desc    Create picking task from delivery order
// @access  Private
const createPickingTask = async (req, res) => {
  try {
    const {
      deliveryOrderId,
      warehouseId,
      assignedTo,
      priority,
      lines,
      notes
    } = req.body;

    // Validate delivery order
    const deliveryOrder = await DeliveryOrder.findById(deliveryOrderId);
    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Validate warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Validate assigned user if provided
    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user || user.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found'
        });
      }
    }

    const pickingTask = await PickingTask.create({
      deliveryOrderId,
      warehouseId,
      assignedTo,
      priority: priority || 'normal',
      lines,
      notes,
      status: 'pending',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Picking task created successfully',
      task: pickingTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating picking task',
      error: error.message
    });
  }
};

// @route   POST /api/tasks/packing
// @desc    Create packing task
// @access  Private
const createPackingTask = async (req, res) => {
  try {
    const {
      deliveryOrderId,
      pickingTaskId,
      warehouseId,
      assignedTo,
      priority,
      lines,
      notes
    } = req.body;

    // Validate delivery order
    const deliveryOrder = await DeliveryOrder.findById(deliveryOrderId);
    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Validate warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Validate picking task if provided
    if (pickingTaskId) {
      const pickingTask = await PickingTask.findById(pickingTaskId);
      if (!pickingTask || pickingTask.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Picking task not found'
        });
      }
    }

    // Validate assigned user if provided
    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user || user.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Assigned user not found'
        });
      }
    }

    const packingTask = await PackingTask.create({
      deliveryOrderId,
      pickingTaskId,
      warehouseId,
      assignedTo,
      priority: priority || 'normal',
      lines,
      notes,
      status: 'pending',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Packing task created successfully',
      task: packingTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating packing task',
      error: error.message
    });
  }
};

module.exports = {
  getPickingTasks,
  startPickingTask,
  completePickingTask,
  getPackingTasks,
  startPackingTask,
  completePackingTask,
  createPickingTask,
  createPackingTask
};
