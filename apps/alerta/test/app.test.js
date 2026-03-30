const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');

function baseConfig() {
  return {
    searchUrls: ['https://example.com/search'],
    filters: {},
    stateFile: '/tmp/state.json',
    run: {
      dryRun: true,
      mode: 'once',
      pollIntervalSeconds: 300,
      retryCount: 0,
      retryBaseDelayMs: 1,
      httpTimeoutMs: 1000,
      maxResultsPerRun: null,
    },
    telegram: { enabled: false },
    whatsapp: { enabled: false },
  };
}

test('runCycle procesa novedades y persiste IDs vistos', async () => {
  const state = { seen: ['https://www.idealista.com/inmueble/1/'] };
  let writtenState = null;

  const app = createApp({
    fetchSearchResults: async () => [
      { id: 'https://www.idealista.com/inmueble/1/', title: 'viejo', rawText: '', url: 'a' },
      { id: 'https://www.idealista.com/inmueble/2/', title: 'nuevo', rawText: '', url: 'b' },
    ],
    matchesFilters: () => true,
    readState: async () => state,
    writeState: async (_path, s) => {
      writtenState = s;
    },
    formatListingMessage: (listing) => listing.title,
    sendTelegramMessage: async () => {},
    sendWhatsAppMessage: async () => {},
    withRetry: async (fn) => fn(),
    log: () => {},
  });

  const result = await app.runCycle(baseConfig());

  assert.equal(result.processed, 1);
  assert.deepEqual(writtenState.seen.sort(), [
    'https://www.idealista.com/inmueble/1/',
    'https://www.idealista.com/inmueble/2/',
  ]);
});

test('runCycle deduplica listings entre múltiples URLs', async () => {
  const sent = [];
  const app = createApp({
    fetchSearchResults: async (url) => [
      { id: 'https://www.idealista.com/inmueble/2/', title: `dup-${url}`, rawText: '', url: 'b', sourceUrl: url },
    ],
    matchesFilters: () => true,
    readState: async () => ({ seen: [] }),
    writeState: async () => {},
    formatListingMessage: (listing) => listing.title,
    sendTelegramMessage: async ({ message }) => sent.push(message),
    sendWhatsAppMessage: async () => {},
    withRetry: async (fn) => fn(),
    log: () => {},
  });

  const config = baseConfig();
  config.searchUrls = ['https://example.com/a', 'https://example.com/b'];
  config.telegram = { enabled: true, botToken: 'token', chatId: 'chat' };
  config.run.dryRun = false;

  const result = await app.runCycle(config);
  assert.equal(result.deduped, 1);
  assert.equal(result.processed, 1);
  assert.equal(sent.length, 1);
});

test('runCycle sigue procesando aunque falle una notificación y guarda solo éxitos', async () => {
  let writtenState = null;
  let count = 0;
  const app = createApp({
    fetchSearchResults: async () => [
      { id: 'ok', title: 'ok', rawText: '', url: 'ok-url', sourceUrl: 'source-a' },
      { id: 'fail', title: 'fail', rawText: '', url: 'fail-url', sourceUrl: 'source-a' },
      { id: 'ok2', title: 'ok2', rawText: '', url: 'ok2-url', sourceUrl: 'source-a' },
    ],
    matchesFilters: () => true,
    readState: async () => ({ seen: [] }),
    writeState: async (_path, state) => {
      writtenState = state;
    },
    formatListingMessage: (listing) => listing.title,
    sendTelegramMessage: async () => {
      count += 1;
      if (count === 2) throw new Error('boom');
    },
    sendWhatsAppMessage: async () => {},
    withRetry: async (fn) => fn(),
    log: () => {},
  });

  const config = baseConfig();
  config.telegram = { enabled: true, botToken: 'token', chatId: 'chat' };
  config.run.dryRun = false;

  const result = await app.runCycle(config);
  assert.equal(result.processed, 2);
  assert.equal(result.failedNotifications, 1);
  assert.deepEqual(writtenState.seen.sort(), ['ok', 'ok2']);
});

test('runCycle respeta maxResultsPerRun y dryRun no llama canales reales', async () => {
  let sent = 0;
  const app = createApp({
    fetchSearchResults: async () => [
      { id: '1', title: 'a', rawText: '', url: 'a' },
      { id: '2', title: 'b', rawText: '', url: 'b' },
      { id: '3', title: 'c', rawText: '', url: 'c' },
    ],
    matchesFilters: () => true,
    readState: async () => ({ seen: ['1'] }),
    writeState: async () => {},
    formatListingMessage: (listing) => listing.title,
    sendTelegramMessage: async () => {
      sent += 1;
    },
    sendWhatsAppMessage: async () => {},
    withRetry: async (fn) => fn(),
    log: () => {},
  });

  const config = baseConfig();
  config.run.maxResultsPerRun = 1;
  config.run.dryRun = true;
  config.telegram = { enabled: true, botToken: 'token', chatId: 'chat' };

  const result = await app.runCycle(config);
  assert.equal(result.processed, 1);
  assert.equal(sent, 0);
});

test('validateConfig exige búsquedas y timeout válido', () => {
  const app = createApp({
    fetchSearchResults: async () => [],
    matchesFilters: () => true,
    readState: async () => ({ seen: [] }),
    writeState: async () => {},
    formatListingMessage: () => '',
    sendTelegramMessage: async () => {},
    sendWhatsAppMessage: async () => {},
    withRetry: async (fn) => fn(),
    log: () => {},
  });

  const config = baseConfig();
  config.searchUrls = [];
  assert.throws(() => app.validateConfig(config), /IDEALISTA_SEARCH_URLS/);

  const config2 = baseConfig();
  config2.run.httpTimeoutMs = 0;
  assert.throws(() => app.validateConfig(config2), /HTTP_TIMEOUT_MS/);
});

test('validateConfig exige credenciales de canales habilitados', () => {
  const app = createApp({
    fetchSearchResults: async () => [],
    matchesFilters: () => true,
    readState: async () => ({ seen: [] }),
    writeState: async () => {},
    formatListingMessage: () => '',
    sendTelegramMessage: async () => {},
    sendWhatsAppMessage: async () => {},
    withRetry: async (fn) => fn(),
    log: () => {},
  });

  const config = baseConfig();
  config.run.dryRun = false;
  config.telegram = { enabled: true, botToken: '', chatId: '' };
  assert.throws(() => app.validateConfig(config), /Telegram habilitado/);

  const config2 = baseConfig();
  config2.run.dryRun = false;
  config2.whatsapp = { enabled: true, accountSid: '', authToken: '', from: '', to: '' };
  assert.throws(() => app.validateConfig(config2), /WhatsApp habilitado/);
});
