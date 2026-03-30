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

    if (config.telegram.enabled) {
      if (!config.telegram.botToken || !config.telegram.chatId) {
        throw new Error('Config inválida: Telegram habilitado pero faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID');
      }
    }

    if (config.whatsapp.enabled) {
      const missing = !config.whatsapp.accountSid || !config.whatsapp.authToken || !config.whatsapp.from || !config.whatsapp.to;
      if (missing) {
        throw new Error(
          'Config inválida: WhatsApp habilitado pero faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM o TWILIO_WHATSAPP_TO',
        );
      }
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
        const listings = await withRetry(
          () =>
            fetchSearchResults(url, {
              timeoutMs: config.run.httpTimeoutMs,
              log: (event, payload) => log('info', event, payload),
            }),
          {
          retries: config.run.retryCount,
          baseDelayMs: config.run.retryBaseDelayMs,
          onRetry: ({ attempt, waitMs, error }) =>
            log('warn', 'retry_fetch', { url, attempt, waitMs, error: error.message }),
          },
        );
        allListings.push(...listings);
      } catch (error) {
        log('error', 'fetch_failed', { url, error: error.message });
      }
    }

    const dedupedListings = Array.from(new Map(allListings.map((listing) => [listing.id, listing])).values());
    const filtered = dedupedListings.filter((item) => matchesFilters(item, config.filters));
    const fresh = filtered.filter((item) => !seen.has(item.id));
    const limited =
      config.run.maxResultsPerRun && config.run.maxResultsPerRun > 0
        ? fresh.slice(0, config.run.maxResultsPerRun)
        : fresh;
    let processed = 0;
    let failedNotifications = 0;

    if (!limited.length) {
      log('info', 'cycle_no_news', {
        collected: allListings.length,
        deduped: dedupedListings.length,
        filtered: filtered.length,
        fresh: fresh.length,
        processed,
        failedNotifications,
      });
      return { processed, collected: allListings.length, deduped: dedupedListings.length, filtered: filtered.length, fresh: fresh.length, failedNotifications };
    }

    for (const listing of limited) {
      try {
        const message = formatListingMessage(listing);
        await notifyListing(config, message);
        seen.add(listing.id);
        processed += 1;
      } catch (error) {
        failedNotifications += 1;
        log('error', 'notify_failed', {
          listingId: listing.id,
          listingUrl: listing.url,
          sourceUrl: listing.sourceUrl,
          error: error.message,
        });
      }
    }

    await writeState(config.stateFile, { seen: [...seen] });
    log('info', 'cycle_done', {
      processed,
      failedNotifications,
      collected: allListings.length,
      deduped: dedupedListings.length,
      filtered: filtered.length,
      fresh: fresh.length,
      mode: config.run.mode,
    });

    return { processed, collected: allListings.length, deduped: dedupedListings.length, filtered: filtered.length, fresh: fresh.length, failedNotifications };
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
