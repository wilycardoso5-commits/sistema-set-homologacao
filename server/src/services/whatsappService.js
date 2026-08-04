const config = require('../config');

function checkIntegrationStatus() {
  const hasToken = !!config.meta.accessToken;
  const hasPhoneId = !!config.meta.phoneNumberId;
  const isConfigured = hasToken && hasPhoneId;

  return {
    configured: isConfigured,
    connected: isConfigured,
    provider: 'Meta WhatsApp Cloud API',
    graphApiVersion: config.meta.graphApiVersion,
    message: isConfigured
      ? 'Integração pronta para envio e recebimento'
      : 'Credenciais da Meta ainda não configuradas'
  };
}

module.exports = {
  checkIntegrationStatus
};
