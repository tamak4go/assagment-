const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// View route
router.get('/login', authController.renderLogin);
router.get('/logout', authController.logout);

// API routes
router.post('/api/register', authController.register);
router.post('/api/login', authController.login);

module.exports = router;

