const { chromium } = require('playwright');

function parseNumber(text) {
  if (!text) return null;
  const normalized = String(text).replace(/[^\d]/g, '');
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 100000000) return null;
  return value;
}

function stripTags(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  return trimmed.startsWith('http') ? trimmed : `https://www.idealista.com${trimmed}`;
}

function listingFromJsonLd(item, sourceUrl) {
  const obj = item && typeof item === 'object' ? item : null;
  const candidate = obj?.item && typeof obj.item === 'object' ? obj.item : obj;
  const url = normalizeUrl(candidate?.url);

  if (!url || !/\/inmueble\//.test(url)) return null;

  const title = candidate?.name || 'Sin título';
  const price = parseNumber(candidate?.offers?.price);
  const rooms = parseNumber(candidate?.numberOfRooms);
  const area = parseNumber(candidate?.floorSize?.value);

  return {
    id: url,
    url,
    sourceUrl,
    title,
    price,
    rooms,
    area,
    rawText: stripTags([title, price ? `${price} €` : '', rooms ? `${rooms} hab` : '', area ? `${area} m²` : ''].join(' ')),
  };
}

function parseJsonLdListings(html, sourceUrl) {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const listings = [];
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson);
      const entries = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.itemListElement)
          ? parsed.itemListElement
          : [parsed];

      for (const entry of entries) {
        const listing = listingFromJsonLd(entry, sourceUrl);
        if (listing) listings.push(listing);
      }
    } catch {
      // Ignora JSON-LD inválido y continua con otros bloques/fallback HTML.
    }
  }

  return listings;
}

function parseHtmlFallbackListings(html, sourceUrl) {
  const listingRegex = /<article[\s\S]*?<a[^>]*href="([^"]*\/inmueble\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/article>/gi;
  const listings = [];
  let match;

  while ((match = listingRegex.exec(html)) !== null) {
    const href = match[1];
    const anchorHtml = match[2];
    const articleHtml = match[0];

    const url = normalizeUrl(href);
    if (!url) continue;

    const title = stripTags(anchorHtml) || 'Sin título';

    const priceMatch = articleHtml.match(/(\d[\d\.\s]*)\s*€/i);
    const roomsMatch = articleHtml.match(/(\d+)\s*hab/i);
    const areaMatch = articleHtml.match(/(\d+)\s*m²/i);

    const price = parseNumber(priceMatch ? priceMatch[0] : null);
    const rooms = parseNumber(roomsMatch ? roomsMatch[0] : null);
    const area = parseNumber(areaMatch ? areaMatch[0] : null);

    listings.push({
      id: url,
      url,
      sourceUrl,
      title,
      price,
      rooms,
      area,
      rawText: stripTags(articleHtml),
    });
  }

  return listings;
}

function dedupeById(listings) {
  return Array.from(new Map(listings.map((listing) => [listing.id, listing])).values());
}

function sanitizeListing(listing) {
  if (!listing || typeof listing !== 'object') return null;
  if (!listing.id || !listing.url) return null;

  return {
    ...listing,
    rawText: stripTags(listing.rawText || listing.title || ''),
  };
}

function parseListings(html, sourceUrl, options = {}) {
  const log = typeof options.log === 'function' ? options.log : null;
  const fromJsonLd = parseJsonLdListings(html, sourceUrl);
  if (log && fromJsonLd.length === 0) {
    log('provider_jsonld_empty', { sourceUrl });
  }
  const fromHtml = parseHtmlFallbackListings(html, sourceUrl);
  if (log && fromJsonLd.length === 0 && fromHtml.length > 0) {
    log('provider_html_fallback_used', { sourceUrl, count: fromHtml.length });
  }

  return dedupeById([...fromJsonLd, ...fromHtml].map(sanitizeListing).filter(Boolean));
}

async function fetchSearchResults(searchUrl, options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 20000;
  const log = typeof options.log === 'function' ? options.log : null;
  const userAgent =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
  let browser;
  let context;
  let page;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ userAgent });
    page = await context.newPage();

    if (log) log('provider_navigation_started', { sourceUrl: searchUrl, timeoutMs });
    const response = await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    const status = response ? response.status() : null;
    if (log) log('provider_navigation_finished', { sourceUrl: searchUrl, status });

    if (!response || status >= 400) {
      throw new Error(`No se pudo obtener ${searchUrl}. Status: ${status ?? 'sin respuesta'}`);
    }

    await page.waitForTimeout(1200);
    const html = await page.content();
    const title = (await page.title()) || '';
    const blockSignals = [
      /\bcaptcha\b/i,
      /\baccess denied\b/i,
      /\bforbidden\b/i,
      /\bverify you are human\b/i,
      /\bare you human\??\b/i,
      /\bnot a robot\b/i,
      /\bi am not a robot\b/i,
      /\bsecurity challenge\b/i,
      /\bchallenge required\b/i,
      /\bchecking your browser\b/i,
    ];
    const looksBlocked = blockSignals.some((pattern) =>
      pattern.test(`${title} ${html.slice(0, 4000)}`)
    );

    if (looksBlocked) {
      if (log) {
        log('provider_block_detected', {
          sourceUrl: searchUrl,
          title: title.slice(0, 200),
        });
      }
      throw new Error('Idealista page appears blocked or challenged');
    }

    // TODO: Soportar paginación de resultados para ampliar cobertura de anuncios.
    // TODO: Evaluar estrategias de rotación/backoff ante anti-bot o bloqueos recurrentes.
    return parseListings(html, searchUrl, { log });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = {
  parseListings,
  fetchSearchResults,
};
