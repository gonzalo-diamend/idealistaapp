function parseNumber(text) {
  if (!text) return null;
  const normalized = text.replace(/[^\d]/g, '');
  if (!normalized) return null;
  return Number(normalized);
}

function stripTags(text) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseListings(html, sourceUrl) {
  const listingRegex = /<article[\s\S]*?<a[^>]*href="([^"]*\/inmueble\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/article>/gi;
  const listings = [];
  let match;

  while ((match = listingRegex.exec(html)) !== null) {
    const href = match[1];
    const anchorHtml = match[2];
    const articleHtml = match[0];

    const url = href.startsWith('http') ? href : `https://www.idealista.com${href}`;
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

  return Array.from(new Map(listings.map((x) => [x.id, x])).values());
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
};
