const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const authRoutes = require('./authRoutes');
const syncRoutes = require('./syncRoutes');

router.use('/', healthRoutes);
router.use('/', whatsappRoutes);
router.use('/', authRoutes);
router.use('/', syncRoutes);

module.exports = router;
