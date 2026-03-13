const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const { authenticateJWT } = require('../middleware/authMiddleware');

// View routes
router.get('/', carController.getAllCars);
router.get('/create', carController.renderCreateForm);
router.get('/edit/:carNumber', carController.renderEditForm);

// API routes
router.get('/api', authenticateJWT, carController.getAllCarsAPI);
router.get('/api/:carNumber', authenticateJWT, carController.getCarByNumber);
router.post('/', authenticateJWT, carController.createCar);
router.put('/:carNumber', authenticateJWT, carController.updateCar);
router.delete('/:carNumber', authenticateJWT, carController.deleteCar);

module.exports = router;
