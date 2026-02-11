const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/homeController');

// Rutas principales
router.get('/', HomeController.showHome);
router.get('/search', HomeController.search);
router.get('/api/search', HomeController.apiSearch);
router.get('/about', HomeController.showAbout);
router.get('/contact', HomeController.showContact);

module.exports = router;