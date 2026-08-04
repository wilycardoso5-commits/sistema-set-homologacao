const whatsappService = require('../services/whatsappService');

function getWhatsAppStatus(req, res) {
  const status = whatsappService.checkIntegrationStatus();
  return res.status(200).json(status);
}

module.exports = {
  getWhatsAppStatus
};
