const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/whatsapp/status', whatsappController.getWhatsAppStatus);

// Rota para enviar mensagens (texto ou template)
router.post('/whatsapp/send', whatsappController.sendMessage);

// Rotas para o Webhook da Meta
router.get('/whatsapp/webhook', whatsappController.verifyWebhook);
router.post('/whatsapp/webhook', whatsappController.handleWebhook);

module.exports = router;
