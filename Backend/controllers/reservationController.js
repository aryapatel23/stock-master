const Reservation = require('../models/Reservation');
const StockLocation = require('../models/StockLocation');
const Product = require('../models/Product');
const Location = require('../models/Location');

// Default reservation expiry time (in minutes)
const DEFAULT_RESERVATION_EXPIRY = 30;

// @route   POST /api/stock/reserve
// @desc    Reserve stock for delivery order, transfer, or pick
// @access  Private
const reserveStock = async (req, res) => {
  try {
    const { referenceType, referenceId, lines, expiryMinutes } = req.body;
    const idempotencyKey = req.headers['idempotency-key'];

    // Check for existing reservation with same idempotency key
    if (idempotencyKey) {
      const existing = await Reservation.findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          success: true,
          message: 'Reservation already exists (idempotent)',
          reservationId: existing._id,
          reservation: existing,
          isExisting: true
        });
      }
    }

    // Validate lines
    if (!lines || lines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one line item is required'
      });
    }

    const reservedLines = [];
    const errors = [];

    // Calculate expiry time
    const expiry = expiryMinutes || DEFAULT_RESERVATION_EXPIRY;
    const expiresAt = new Date(Date.now() + expiry * 60 * 1000);

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const { productId, locationId, qty } = line;

      try {
        // Get product
        const product = await Product.findById(productId);
        if (!product || product.isDeleted) {
          errors.push({
            line: i + 1,
            productId,
            error: 'Product not found'
          });
          continue;
        }

        // If locationId specified, reserve from that location
        if (locationId) {
          const stockLoc = await StockLocation.findOne({ productId, locationId });
          
          if (!stockLoc) {
            errors.push({
              line: i + 1,
              productId,
              locationId,
              error: 'No stock at specified location'
            });
            continue;
          }

          const available = stockLoc.quantity - stockLoc.reserved;
          if (available < qty) {
            errors.push({
              line: i + 1,
              productId,
              locationId,
              requested: qty,
              available,
              error: 'Insufficient stock'
            });
            continue;
          }

          // Reserve stock
          stockLoc.reserved += qty;
          await stockLoc.save();

          const location = await Location.findById(locationId);
          
          reservedLines.push({
            productId,
            locationId,
            warehouseId: location?.warehouseId,
            qty
          });
        } else {
          // Auto-allocate from available locations
          const stockLocs = await StockLocation.find({ productId })
            .sort({ quantity: -1 });

          let remaining = qty;

          for (const stockLoc of stockLocs) {
            if (remaining <= 0) break;

            const available = stockLoc.quantity - stockLoc.reserved;
            if (available > 0) {
              const toReserve = Math.min(available, remaining);
              
              // Get location details
              const location = await Location.findById(stockLoc.locationId);
              if (!location || location.isDeleted) {
                continue;
              }

              stockLoc.reserved += toReserve;
              await stockLoc.save();

              reservedLines.push({
                productId,
                locationId: stockLoc.locationId,
                warehouseId: location.warehouseId,
                qty: toReserve
              });

              remaining -= toReserve;
            }
          }

          if (remaining > 0) {
            errors.push({
              line: i + 1,
              productId,
              requested: qty,
              reserved: qty - remaining,
              shortfall: remaining,
              error: 'Insufficient total stock'
            });
            // Don't update product.totalReserved if we couldn't reserve everything
            continue;
          }
        }

        // Update product total reserved (only if fully reserved)
        product.totalReserved += qty;
        await product.save();

      } catch (error) {
        errors.push({
          line: i + 1,
          productId,
          error: error.message
        });
      }
    }

    if (reservedLines.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No stock could be reserved',
        errors
      });
    }

    // Create reservation record
    const reservation = await Reservation.create({
      referenceType,
      referenceId,
      idempotencyKey,
      lines: reservedLines,
      expiresAt,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Stock reserved successfully',
      reservationId: reservation._id,
      reservation: {
        id: reservation._id,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
        lines: reservedLines
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reserving stock',
      error: error.message
    });
  }
};

// @route   POST /api/stock/release
// @desc    Release reservation(s)
// @access  Private
const releaseStock = async (req, res) => {
  try {
    const { reservationId, referenceId } = req.body;

    if (!reservationId && !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'Either reservationId or referenceId is required'
      });
    }

    // Find reservation(s)
    const query = { status: 'active' };
    if (reservationId) {
      query._id = reservationId;
    } else {
      query.referenceId = referenceId;
    }

    const reservations = await Reservation.find(query);

    if (reservations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active reservations found'
      });
    }

    const released = [];

    for (const reservation of reservations) {
      // Release stock for each line
      for (const line of reservation.lines) {
        const stockLoc = await StockLocation.findOne({
          productId: line.productId,
          locationId: line.locationId
        });

        if (stockLoc) {
          stockLoc.reserved = Math.max(0, stockLoc.reserved - line.qty);
          await stockLoc.save();
        }

        // Update product total reserved
        const product = await Product.findById(line.productId);
        if (product) {
          product.totalReserved = Math.max(0, product.totalReserved - line.qty);
          await product.save();
        }
      }

      // Mark reservation as released
      reservation.status = 'released';
      reservation.releasedAt = new Date();
      await reservation.save();

      released.push(reservation._id);
    }

    res.json({
      success: true,
      message: `Released ${released.length} reservation(s)`,
      releasedReservations: released
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error releasing stock',
      error: error.message
    });
  }
};

// @route   GET /api/reservations
// @desc    List current reservations
// @access  Private
const getReservations = async (req, res) => {
  try {
    const { 
      status, 
      referenceType, 
      referenceId, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['active', 'released'] }; // Exclude expired by default
    }

    if (referenceType) {
      query.referenceType = referenceType;
    }

    if (referenceId) {
      query.referenceId = referenceId;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Reservation.countDocuments(query);

    const reservations = await Reservation.find(query)
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Format response
    const formattedReservations = reservations.map(r => ({
      id: r._id,
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      status: r.status,
      totalLines: r.lines.length,
      totalQty: r.lines.reduce((sum, line) => sum + line.qty, 0),
      expiresAt: r.expiresAt,
      releasedAt: r.releasedAt,
      createdBy: r.createdBy?.name,
      createdAt: r.createdAt
    }));

    res.json({
      success: true,
      reservations: formattedReservations,
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
      message: 'Error fetching reservations',
      error: error.message
    });
  }
};

module.exports = {
  reserveStock,
  releaseStock,
  getReservations
};
