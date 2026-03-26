const { loadEnvFile } = require('./env');

loadEnvFile('apps/alerta/.env');

const { loadConfig } = require('./config');
const { fetchSearchResults } = require('./providers/idealista');
const { matchesFilters } = require('./filters');
const { readState, writeState } = require('./state/store');
const { formatListingMessage } = require('./format');
const { sendTelegramMessage } = require('./notifiers/telegram');
const { sendWhatsAppMessage } = require('./notifiers/whatsapp');

async function run() {
  const config = loadConfig();

  if (!config.searchUrls.length) {
    throw new Error('Config inválida: IDEALISTA_SEARCH_URLS está vacío');
  }

  const state = await readState(config.stateFile);
  const seen = new Set(state.seen || []);

  const allListings = [];

  for (const url of config.searchUrls) {
    const listings = await fetchSearchResults(url);
    allListings.push(...listings);
  }

  const filtered = allListings.filter((item) => matchesFilters(item, config.filters));
  const fresh = filtered.filter((item) => !seen.has(item.id));

  if (!fresh.length) {
    console.log('Sin novedades.');
    return;
  }

  for (const listing of fresh) {
    const message = formatListingMessage(listing);

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

    seen.add(listing.id);
  }

  await writeState(config.stateFile, { seen: [...seen] });
  console.log(`Alertas enviadas: ${fresh.length}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
