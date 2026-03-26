const { loadEnvFile } = require('./env');

loadEnvFile('apps/alerta/.env');

const { loadConfig } = require('./config');
const { fetchSearchResults } = require('./providers/idealista');
const { matchesFilters } = require('./filters');
const { readState, writeState } = require('./state/store');
const { formatListingMessage } = require('./format');
const { sendTelegramMessage } = require('./notifiers/telegram');
const { sendWhatsAppMessage } = require('./notifiers/whatsapp');

function validateConfig(config) {
  if (!config.searchUrls.length) {
    throw new Error('Config inválida: IDEALISTA_SEARCH_URLS está vacío');
  }

  if (!config.telegram.enabled && !config.whatsapp.enabled && !config.run.dryRun) {
    throw new Error('No hay canales activos. Activa Telegram/WhatsApp o usa DRY_RUN=true');
  }
}

async function notifyListing(config, message) {
  if (config.run.dryRun) {
    console.log('[DRY RUN] Mensaje generado:\n' + message + '\n');
    return;
  }

  if (config.telegram.enabled) {
    await sendTelegramMessage({
      botToken: config.telegram.botToken,
      chatId: config.telegram.chatId,
      message,
    });
  }

  if (config.whatsapp.enabled) {
    await sendWhatsAppMessage({
      accountSid: config.whatsapp.accountSid,
      authToken: config.whatsapp.authToken,
      from: config.whatsapp.from,
      to: config.whatsapp.to,
      message,
    });
  }
}

async function run() {
  const config = loadConfig();
  validateConfig(config);

  const state = await readState(config.stateFile);
  const seen = new Set(state.seen || []);

  const allListings = [];

  for (const url of config.searchUrls) {
    const listings = await fetchSearchResults(url);
    allListings.push(...listings);
  }

  const filtered = allListings.filter((item) => matchesFilters(item, config.filters));
  const fresh = filtered.filter((item) => !seen.has(item.id));
  const limited =
    config.run.maxResultsPerRun && config.run.maxResultsPerRun > 0
      ? fresh.slice(0, config.run.maxResultsPerRun)
      : fresh;

  if (!limited.length) {
    console.log('Sin novedades.');
    return;
  }

  for (const listing of limited) {
    const message = formatListingMessage(listing);
    await notifyListing(config, message);
    seen.add(listing.id);
  }

  await writeState(config.stateFile, { seen: [...seen] });
  console.log(`Alertas procesadas: ${limited.length}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
