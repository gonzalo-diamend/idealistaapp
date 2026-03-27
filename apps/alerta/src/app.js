const { setTimeout: sleep } = require('timers/promises');

function createApp(deps) {
  const {
    fetchSearchResults,
    matchesFilters,
    readState,
    writeState,
    formatListingMessage,
    sendTelegramMessage,
    sendWhatsAppMessage,
    withRetry,
    log,
  } = deps;

  function validateConfig(config) {
    if (!config.searchUrls.length) {
      throw new Error('Config inválida: IDEALISTA_SEARCH_URLS está vacío');
    }

    if (!config.telegram.enabled && !config.whatsapp.enabled && !config.run.dryRun) {
      throw new Error('No hay canales activos. Activa Telegram/WhatsApp o usa DRY_RUN=true');
    }

    if (!config.run.httpTimeoutMs || config.run.httpTimeoutMs <= 0) {
      throw new Error('HTTP_TIMEOUT_MS debe ser mayor a 0');
    }
  }

  async function notifyListing(config, message) {
    if (config.run.dryRun) {
      log('info', 'dry_run_message', { preview: message.slice(0, 160) });
      return;
    }

    if (config.telegram.enabled) {
      await withRetry(
        () =>
          sendTelegramMessage({
            botToken: config.telegram.botToken,
            chatId: config.telegram.chatId,
            message,
            timeoutMs: config.run.httpTimeoutMs,
          }),
        {
          retries: config.run.retryCount,
          baseDelayMs: config.run.retryBaseDelayMs,
          onRetry: ({ attempt, waitMs, error }) =>
            log('warn', 'retry_telegram', { attempt, waitMs, error: error.message }),
        },
      );
    }

    if (config.whatsapp.enabled) {
      await withRetry(
        () =>
          sendWhatsAppMessage({
            accountSid: config.whatsapp.accountSid,
            authToken: config.whatsapp.authToken,
            from: config.whatsapp.from,
            to: config.whatsapp.to,
            message,
            timeoutMs: config.run.httpTimeoutMs,
          }),
        {
          retries: config.run.retryCount,
          baseDelayMs: config.run.retryBaseDelayMs,
          onRetry: ({ attempt, waitMs, error }) =>
            log('warn', 'retry_whatsapp', { attempt, waitMs, error: error.message }),
        },
      );
    }
  }

  async function runCycle(config) {
    const state = await readState(config.stateFile);
    const seen = new Set(state.seen || []);

    const allListings = [];
    for (const url of config.searchUrls) {
      try {
        const listings = await withRetry(() => fetchSearchResults(url, { timeoutMs: config.run.httpTimeoutMs }), {
          retries: config.run.retryCount,
          baseDelayMs: config.run.retryBaseDelayMs,
          onRetry: ({ attempt, waitMs, error }) =>
            log('warn', 'retry_fetch', { url, attempt, waitMs, error: error.message }),
        });
        allListings.push(...listings);
      } catch (error) {
        log('error', 'fetch_failed', { url, error: error.message });
      }
    }

    const filtered = allListings.filter((item) => matchesFilters(item, config.filters));
    const fresh = filtered.filter((item) => !seen.has(item.id));
    const limited =
      config.run.maxResultsPerRun && config.run.maxResultsPerRun > 0
        ? fresh.slice(0, config.run.maxResultsPerRun)
        : fresh;

    if (!limited.length) {
      log('info', 'cycle_no_news', { collected: allListings.length, filtered: filtered.length });
      return { processed: 0, collected: allListings.length, filtered: filtered.length };
    }

    for (const listing of limited) {
      const message = formatListingMessage(listing);
      await notifyListing(config, message);
      seen.add(listing.id);
    }

    await writeState(config.stateFile, { seen: [...seen] });
    log('info', 'cycle_done', {
      processed: limited.length,
      collected: allListings.length,
      filtered: filtered.length,
      mode: config.run.mode,
    });

    return { processed: limited.length, collected: allListings.length, filtered: filtered.length };
  }

  async function run(config) {
    validateConfig(config);
    log('info', 'app_started', {
      mode: config.run.mode,
      pollIntervalSeconds: config.run.pollIntervalSeconds,
      dryRun: config.run.dryRun,
    });

    if (config.run.mode === 'once') {
      return runCycle(config);
    }

    while (true) {
      await runCycle(config);
      log('info', 'sleeping', { seconds: config.run.pollIntervalSeconds });
      await sleep(config.run.pollIntervalSeconds * 1000);
    }
  }

  return {
    validateConfig,
    notifyListing,
    runCycle,
    run,
  };
}

module.exports = {
  createApp,
};
