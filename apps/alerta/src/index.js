const { loadEnvFile } = require('./env');

loadEnvFile('apps/alerta/.env');

const { loadConfig } = require('./config');
const { fetchSearchResults } = require('./providers/idealista');
const { matchesFilters } = require('./filters');
const { readState, writeState } = require('./state/store');
const { formatListingMessage } = require('./format');
const { sendTelegramMessage } = require('./notifiers/telegram');
const { sendWhatsAppMessage } = require('./notifiers/whatsapp');
const { withRetry } = require('./retry');
const { log } = require('./logger');
const { createApp } = require('./app');

async function run() {
  const config = loadConfig();
  const app = createApp({
    fetchSearchResults,
    matchesFilters,
    readState,
    writeState,
    formatListingMessage,
    sendTelegramMessage,
    sendWhatsAppMessage,
    withRetry,
    log,
  });

  return app.run(config);
}

run().catch((error) => {
  log('error', 'app_failed', { error: error.message });
  process.exit(1);
});
