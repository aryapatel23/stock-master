const express = require('express');
const { auth } = require('../middleware/auth');
const reservationController = require('../controllers/reservationController');

const router = express.Router();

// Reservation list route
router.get('/', auth, reservationController.getReservations);

module.exports = router;
