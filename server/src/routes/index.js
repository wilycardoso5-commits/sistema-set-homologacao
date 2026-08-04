const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const whatsappRoutes = require('./whatsappRoutes');

router.use('/', healthRoutes);
router.use('/', whatsappRoutes);

module.exports = router;
