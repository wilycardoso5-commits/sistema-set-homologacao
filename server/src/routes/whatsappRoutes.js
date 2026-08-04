const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/whatsapp/status', whatsappController.getWhatsAppStatus);

module.exports = router;
