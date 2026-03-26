const { fetchWithTimeout } = require('../http');

async function sendTelegramMessage({ botToken, chatId, message, timeoutMs = 15000 }) {
  if (!botToken || !chatId) {
    throw new Error('Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error enviando Telegram: ${response.status} ${body}`);
  }
}

module.exports = {
  sendTelegramMessage,
};
