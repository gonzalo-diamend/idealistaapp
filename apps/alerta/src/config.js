const path = require('path');

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return String(value).toLowerCase() === 'true';
}

function toList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function loadConfig() {
  const searchUrls = toList(process.env.IDEALISTA_SEARCH_URLS);

  return {
    searchUrls,
    filters: {
      maxPrice: toNumber(process.env.MAX_PRICE),
      minRooms: toNumber(process.env.MIN_ROOMS),
      minArea: toNumber(process.env.MIN_AREA),
      requiredKeywords: toList(process.env.REQUIRED_KEYWORDS).map((x) => x.toLowerCase()),
      blockedKeywords: toList(process.env.BLOCKED_KEYWORDS).map((x) => x.toLowerCase()),
    },
    run: {
      dryRun: toBoolean(process.env.DRY_RUN, false),
      maxResultsPerRun: toNumber(process.env.MAX_RESULTS_PER_RUN),
      mode: process.env.RUN_MODE === 'watch' ? 'watch' : 'once',
      pollIntervalSeconds: toNumber(process.env.POLL_INTERVAL_SECONDS) || 300,
      retryCount: toNumber(process.env.RETRY_COUNT) ?? 2,
      retryBaseDelayMs: toNumber(process.env.RETRY_BASE_DELAY_MS) ?? 400,
    },
    stateFile: process.env.STATE_FILE
      ? path.resolve(process.env.STATE_FILE)
      : path.resolve('apps/alerta/.state/seen-listings.json'),
    telegram: {
      enabled: toBoolean(process.env.ENABLE_TELEGRAM, false),
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
    },
    whatsapp: {
      enabled: toBoolean(process.env.ENABLE_WHATSAPP, false),
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.TWILIO_WHATSAPP_TO,
    },
  };
}

module.exports = {
  loadConfig,
};
