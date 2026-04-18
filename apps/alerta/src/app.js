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

    if (!config.run.maxPagesPerSearch || config.run.maxPagesPerSearch <= 0) {
      throw new Error('MAX_PAGES_PER_SEARCH debe ser mayor a 0');
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
      return { delivered: false, previewed: true };
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

    return { delivered: true, previewed: false };
  }

  function buildStateEntry(listing, timestamp) {
    return {
      id: listing.id,
      url: listing.url,
      title: listing.title || 'Sin título',
      sourceUrl: listing.sourceUrl || null,
      firstSeenAt: timestamp,
      lastSeenAt: timestamp,
      lastPrice: listing.price ?? null,
    };
  }

  function updateStateEntry(previousEntry, listing, timestamp) {
    return {
      id: listing.id,
      url: listing.url,
      title: listing.title || previousEntry?.title || 'Sin título',
      sourceUrl: listing.sourceUrl || previousEntry?.sourceUrl || null,
      firstSeenAt: previousEntry?.firstSeenAt || timestamp,
      lastSeenAt: timestamp,
      lastPrice: listing.price ?? previousEntry?.lastPrice ?? null,
    };
  }

  function normalizeState(state) {
    const entries = {};

    if (state && Array.isArray(state.seen)) {
      for (const id of state.seen) {
        if (!id) continue;
        entries[id] = {
          id,
          url: id,
          title: 'Sin título',
          sourceUrl: null,
          firstSeenAt: null,
          lastSeenAt: null,
          lastPrice: null,
        };
      }
    }

    if (state && state.entries && typeof state.entries === 'object') {
      for (const [id, entry] of Object.entries(state.entries)) {
        if (!id) continue;
        entries[id] = {
          id,
          url: entry?.url || id,
          title: entry?.title || 'Sin título',
          sourceUrl: entry?.sourceUrl || null,
          firstSeenAt: entry?.firstSeenAt || null,
          lastSeenAt: entry?.lastSeenAt || null,
          lastPrice: entry?.lastPrice ?? null,
        };
      }
    }

    return {
      seen: Object.keys(entries),
      entries,
    };
  }

  async function runCycle(config) {
    const state = normalizeState(await readState(config.stateFile));
    const seen = new Set(state.seen || []);
    const entries = { ...(state.entries || {}) };
    const allListings = [];

    for (const url of config.searchUrls) {
      try {
        const listings = await withRetry(
          () =>
            fetchSearchResults(url, {
              timeoutMs: config.run.httpTimeoutMs,
              log: (event, payload) => log('info', event, payload),
              maxPages: config.run.maxPagesPerSearch,
              headless: config.run.headless,
              navigationDelayMs: config.run.navigationDelayMs,
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
    const priceDrops = filtered.filter((item) => {
      const previous = entries[item.id];
      return (
        previous
        && previous.lastPrice !== null
        && previous.lastPrice !== undefined
        && item.price !== null
        && item.price !== undefined
        && item.price < previous.lastPrice
      );
    });

    const prioritized = [...fresh];
    for (const item of priceDrops) {
      if (!prioritized.some((current) => current.id === item.id)) {
        prioritized.push(item);
      }
    }

    const limited =
      config.run.maxResultsPerRun && config.run.maxResultsPerRun > 0
        ? prioritized.slice(0, config.run.maxResultsPerRun)
        : prioritized;

    let processed = 0;
    let previewed = 0;
    let failedNotifications = 0;
    const timestamp = new Date().toISOString();

    for (const listing of filtered) {
      const previous = entries[listing.id];
      entries[listing.id] = previous
        ? updateStateEntry(previous, listing, timestamp)
        : buildStateEntry(listing, timestamp);
      seen.add(listing.id);
    }

    if (!limited.length) {
      if (!config.run.dryRun) {
        await writeState(config.stateFile, { seen: [...seen], entries });
      }

      log('info', 'cycle_no_news', {
        collected: allListings.length,
        deduped: dedupedListings.length,
        filtered: filtered.length,
        fresh: fresh.length,
        priceDrops: priceDrops.length,
        processed,
        previewed,
        failedNotifications,
      });

      return {
        processed,
        previewed,
        collected: allListings.length,
        deduped: dedupedListings.length,
        filtered: filtered.length,
        fresh: fresh.length,
        priceDrops: priceDrops.length,
        failedNotifications,
      };
    }

    for (const listing of limited) {
      try {
        const previous = state.entries[listing.id] || null;
        const reason = previous ? 'price_drop' : 'new_listing';
        const message = formatListingMessage(listing, { reason, previous });
        const notifyResult = await notifyListing(config, message);

        if (notifyResult.previewed) {
          previewed += 1;
          continue;
        }

        if (notifyResult.delivered) {
          processed += 1;
        }
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

    if (!config.run.dryRun) {
      await writeState(config.stateFile, { seen: [...seen], entries });
    }

    log('info', 'cycle_done', {
      processed,
      previewed,
      failedNotifications,
      collected: allListings.length,
      deduped: dedupedListings.length,
      filtered: filtered.length,
      fresh: fresh.length,
      priceDrops: priceDrops.length,
      mode: config.run.mode,
    });

    return {
      processed,
      previewed,
      collected: allListings.length,
      deduped: dedupedListings.length,
      filtered: filtered.length,
      fresh: fresh.length,
      priceDrops: priceDrops.length,
      failedNotifications,
    };
  }

  async function run(config) {
    validateConfig(config);
    log('info', 'app_started', {
      mode: config.run.mode,
      pollIntervalSeconds: config.run.pollIntervalSeconds,
      dryRun: config.run.dryRun,
      maxPagesPerSearch: config.run.maxPagesPerSearch,
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
    normalizeState,
  };
}

module.exports = {
  createApp,
};
