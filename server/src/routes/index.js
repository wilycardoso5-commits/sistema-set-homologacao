const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const authRoutes = require('./authRoutes');

router.use('/', healthRoutes);
router.use('/', whatsappRoutes);
router.use('/', authRoutes);

module.exports = router;
