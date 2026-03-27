async function sendWhatsAppMessage({ accountSid, authToken, from, to, message }) {
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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error enviando WhatsApp: ${response.status} ${body}`);
  }
}

module.exports = {
  sendWhatsAppMessage,
};
