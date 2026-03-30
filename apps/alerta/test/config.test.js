const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { loadConfig } = require('../src/config');

test('loadConfig parsea filtros y modo watch', () => {
  process.env.IDEALISTA_SEARCH_URLS = 'https://a.com, https://b.com';
  process.env.MAX_PRICE = '1200';
  process.env.MIN_ROOMS = '2';
  process.env.MIN_AREA = '60';
  process.env.REQUIRED_KEYWORDS = 'terraza, ascensor';
  process.env.BLOCKED_KEYWORDS = 'interior';
  process.env.RUN_MODE = 'watch';
  process.env.POLL_INTERVAL_SECONDS = '90';
  process.env.RETRY_COUNT = '4';
  process.env.RETRY_BASE_DELAY_MS = '250';
  process.env.DRY_RUN = 'true';

  const config = loadConfig();

  assert.deepEqual(config.searchUrls, ['https://a.com', 'https://b.com']);
  assert.equal(config.filters.maxPrice, 1200);
  assert.equal(config.filters.minRooms, 2);
  assert.equal(config.filters.minArea, 60);
  assert.deepEqual(config.filters.requiredKeywords, ['terraza', 'ascensor']);
  assert.deepEqual(config.filters.blockedKeywords, ['interior']);
  assert.equal(config.run.mode, 'watch');
  assert.equal(config.run.pollIntervalSeconds, 90);
  assert.equal(config.run.retryCount, 4);
  assert.equal(config.run.retryBaseDelayMs, 250);
  assert.equal(config.run.dryRun, true);
});

test('loadConfig soporta booleanos extendidos y state path absoluto', () => {
  process.env.ENABLE_TELEGRAM = 'yes';
  process.env.ENABLE_WHATSAPP = '1';
  process.env.DRY_RUN = 'on';
  delete process.env.STATE_FILE;

  const config = loadConfig();
  assert.equal(config.telegram.enabled, true);
  assert.equal(config.whatsapp.enabled, true);
  assert.equal(config.run.dryRun, true);
  assert.equal(path.isAbsolute(config.stateFile), true);
});

test('loadConfig usa defaults cuando faltan variables', () => {
  delete process.env.RUN_MODE;
  delete process.env.POLL_INTERVAL_SECONDS;
  delete process.env.RETRY_COUNT;
  delete process.env.RETRY_BASE_DELAY_MS;
  delete process.env.DRY_RUN;

  const config = loadConfig();
  assert.equal(config.run.mode, 'once');
  assert.equal(config.run.pollIntervalSeconds, 300);
  assert.equal(config.run.retryCount, 2);
  assert.equal(config.run.retryBaseDelayMs, 400);
  assert.equal(config.run.dryRun, false);
});
