const whatsappService = require('../services/whatsappService');
const config = require('../config');

function getWhatsAppStatus(req, res) {
  const status = whatsappService.checkIntegrationStatus();
  return res.status(200).json(status);
}

async function sendMessage(req, res) {
  try {
    const { to, type, text, templateName, languageCode, components } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'O destinatário (to) é obrigatório.' });
    }

    let result;
    if (type === 'template') {
      if (!templateName) return res.status(400).json({ error: 'Nome do template é obrigatório para type=template.' });
      result = await whatsappService.sendTemplateMessage(to, templateName, languageCode, components);
    } else {
      if (!text) return res.status(400).json({ error: 'Texto é obrigatório para type=text.' });
      result = await whatsappService.sendTextMessage(to, text);
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Erro ao enviar mensagem do WhatsApp:', error.response?.data || error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Falha ao enviar mensagem', 
      details: error.response?.data || error.message 
    });
  }
}

function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === config.meta.webhookVerifyToken) {
      console.log('WEBHOOK VERIFIED');
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
}

function handleWebhook(req, res) {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const from = msg.from; 
      const text = msg.text?.body;
      console.log(`Mensagem recebida de ${from}: ${text}`);
      // Lógica futura: salvar no BD, emitir websocket, etc.
    } else if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.statuses) {
      const status = body.entry[0].changes[0].value.statuses[0];
      console.log(`Status de mensagem atualizado: ${status.id} - ${status.status}`);
      // Lógica futura: atualizar status no BD (entregue, lida, etc.)
    }
    return res.sendStatus(200);
  }
  return res.sendStatus(404);
}

module.exports = {
  getWhatsAppStatus,
  sendMessage,
  verifyWebhook,
  handleWebhook
};
