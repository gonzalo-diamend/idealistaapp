const path = require('path');
const APP_ROOT = path.resolve(__dirname, '..');

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function withDefault(value, fallback) {
  return value === null ? fallback : value;
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
      mode: process.env.RUN_MODE || 'once',
      pollIntervalSeconds: withDefault(toNumber(process.env.POLL_INTERVAL_SECONDS), 300),
      retryCount: withDefault(toNumber(process.env.RETRY_COUNT), 2),
      retryBaseDelayMs: withDefault(toNumber(process.env.RETRY_BASE_DELAY_MS), 400),
      dryRun: toBoolean(process.env.DRY_RUN, false),
      httpTimeoutMs: withDefault(toNumber(process.env.HTTP_TIMEOUT_MS), 15000),
      maxResultsPerRun: withDefault(toNumber(process.env.MAX_RESULTS_PER_RUN), null),
    },
    stateFile: process.env.STATE_FILE
      ? path.resolve(process.env.STATE_FILE)
      : path.resolve(APP_ROOT, '.state/seen-listings.json'),
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
