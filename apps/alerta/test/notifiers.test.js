const test = require('node:test');
const assert = require('node:assert/strict');

const { sendTelegramMessage } = require('../src/notifiers/telegram');
const { sendWhatsAppMessage } = require('../src/notifiers/whatsapp');

test('sendTelegramMessage falla sin credenciales', async () => {
  await assert.rejects(() => sendTelegramMessage({ message: 'hola' }), /Faltan TELEGRAM/);
});

test('sendWhatsAppMessage falla sin credenciales', async () => {
  await assert.rejects(() => sendWhatsAppMessage({ message: 'hola' }), /Faltan credenciales/);
});

test('sendTelegramMessage envía payload esperado', async () => {
  const originalFetch = global.fetch;
  let called = false;

  global.fetch = async (url, options) => {
    called = true;
    assert.match(url, /api\.telegram\.org/);
    assert.equal(options.method, 'POST');
    return { ok: true, text: async () => '' };
  };

  try {
    await sendTelegramMessage({
      botToken: 'token',
      chatId: 'chat',
      message: 'hola',
      timeoutMs: 1000,
    });
    assert.equal(called, true);
  } finally {
    global.fetch = originalFetch;
  }
});
