const config = require('../config');
const axios = require('axios');

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

async function sendTextMessage(to, text) {
  if (!config.meta.accessToken || !config.meta.phoneNumberId) {
    throw new Error('Credenciais da Meta não configuradas');
  }

  const url = `https://graph.facebook.com/${config.meta.graphApiVersion}/${config.meta.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'text',
    text: {
      preview_url: false,
      body: text
    }
  };

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${config.meta.accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

async function sendTemplateMessage(to, templateName, languageCode = 'pt_BR', components = []) {
  if (!config.meta.accessToken || !config.meta.phoneNumberId) {
    throw new Error('Credenciais da Meta não configuradas');
  }

  const url = `https://graph.facebook.com/${config.meta.graphApiVersion}/${config.meta.phoneNumberId}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: components
    }
  };

  const response = await axios.post(url, payload, {
    headers: {
      'Authorization': `Bearer ${config.meta.accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data;
}

module.exports = {
  checkIntegrationStatus,
  sendTextMessage,
  sendTemplateMessage
};
