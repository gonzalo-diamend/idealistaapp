const { fetchWithTimeout } = require('../http');

async function sendWhatsAppMessage({ accountSid, authToken, from, to, message, timeoutMs = 15000 }) {
  if (!accountSid || !authToken || !from || !to) {
    throw new Error('Faltan credenciales de Twilio para WhatsApp');
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({
    From: from,
    To: to,
    Body: message,
  });

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload,
    },
    timeoutMs,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error enviando WhatsApp: ${response.status} ${body}`);
  }
}

module.exports = {
  sendWhatsAppMessage,
};
