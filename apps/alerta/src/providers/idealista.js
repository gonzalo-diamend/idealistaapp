function parseNumber(text) {
  if (!text) return null;
  const normalized = String(text).replace(/[^\d]/g, '');
  if (!normalized) return null;
  return Number(normalized);
}

function stripTags(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeListing(raw, sourceUrl) {
  const url = raw.url?.startsWith('http') ? raw.url : `https://www.idealista.com${raw.url || ''}`;
  if (!url.includes('/inmueble/')) return null;

  const title = stripTags(raw.title) || 'Sin título';
  const price = parseNumber(raw.price);
  const rooms = parseNumber(raw.rooms);
  const area = parseNumber(raw.area);

  return {
    id: url,
    url,
    sourceUrl,
    title,
    price,
    rooms,
    area,
    rawText: stripTags(raw.rawText || `${title} ${raw.price || ''} ${raw.rooms || ''} ${raw.area || ''}`),
  };
}

function parseJsonLdListings(html, sourceUrl) {
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  const listings = [];

  for (const [, payload] of matches) {
    try {
      const parsed = JSON.parse(payload.trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed];

      for (const node of nodes) {
        const items = node?.itemListElement || [];
        for (const item of items) {
          const listing = item?.item || item;
          const normalized = normalizeListing(
            {
              url: listing?.url,
              title: listing?.name,
              price: listing?.offers?.price,
              rooms: listing?.numberOfRooms,
              area: listing?.floorSize?.value,
              rawText: JSON.stringify(listing),
            },
            sourceUrl,
          );
          if (normalized) listings.push(normalized);
        }
      }
    } catch {
      // Ignorar JSON inválido y continuar con otros scripts.
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

    const priceMatch = articleHtml.match(/(\d[\d\.\s]*)\s*€/i);
    const roomsMatch = articleHtml.match(/(\d+)\s*hab/i);
    const areaMatch = articleHtml.match(/(\d+)\s*m²/i);

    const normalized = normalizeListing(
      {
        url: href,
        title: anchorHtml,
        price: priceMatch ? priceMatch[0] : null,
        rooms: roomsMatch ? roomsMatch[0] : null,
        area: areaMatch ? areaMatch[0] : null,
        rawText: articleHtml,
      },
      sourceUrl,
    );

    if (normalized) listings.push(normalized);
  }

  return listings;
}

function parseListings(html, sourceUrl) {
  const jsonLdListings = parseJsonLdListings(html, sourceUrl);
  const fallbackListings = parseHtmlFallbackListings(html, sourceUrl);
  const merged = [...jsonLdListings, ...fallbackListings];

  return Array.from(new Map(merged.map((x) => [x.id, x])).values());
}

async function fetchSearchResults(searchUrl) {
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener ${searchUrl}. Status: ${response.status}`);
  }

  const html = await response.text();
  return parseListings(html, searchUrl);
}

module.exports = {
  fetchSearchResults,
  parseListings,
};
