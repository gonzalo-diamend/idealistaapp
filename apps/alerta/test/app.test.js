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
