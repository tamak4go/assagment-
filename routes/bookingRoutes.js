const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticateJWT, requireAuthPage } = require('../middleware/authMiddleware');

// View routes
router.get('/', requireAuthPage, bookingController.getAllBookings);
router.get('/create', requireAuthPage, bookingController.renderCreateForm);
router.get('/edit/:bookingId', requireAuthPage, bookingController.renderEditForm);

// API routes
router.get('/api', authenticateJWT, bookingController.getAllBookingsAPI);
router.get('/api/:bookingId', authenticateJWT, bookingController.getBookingById);
router.post('/', authenticateJWT, bookingController.createBooking);
router.put('/:bookingId', authenticateJWT, bookingController.updateBooking);
router.delete('/:bookingId', authenticateJWT, bookingController.deleteBooking);

// Receive car (check-in)
router.post('/:bookingId/receive', authenticateJWT, bookingController.receiveCar);

// Complete booking (drop-off)
router.post('/:bookingId/complete', authenticateJWT, bookingController.completeBooking);

module.exports = router;
