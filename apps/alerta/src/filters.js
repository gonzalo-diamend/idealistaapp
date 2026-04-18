function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAllRequired(text, requiredKeywords) {
  if (!requiredKeywords.length) return true;
  return requiredKeywords.every((word) => text.includes(word));
}

function containsBlocked(text, blockedKeywords) {
  if (!blockedKeywords.length) return false;
  return blockedKeywords.some((word) => text.includes(word));
}

function containsAny(text, keywords) {
  if (!keywords.length) return true;
  return keywords.some((word) => text.includes(word));
}

function matchesFilters(listing, filters) {
  const text = normalizeText(listing.rawText);

  const requiredKeywords = (filters.requiredKeywords || []).map(normalizeText);
  const blockedKeywords = (filters.blockedKeywords || []).map(normalizeText);
  const allowedLocations = (filters.allowedLocations || []).map(normalizeText);
  const allowedPropertyTypes = (filters.allowedPropertyTypes || []).map(normalizeText);
  const blockedPropertyTypes = (filters.blockedPropertyTypes || []).map(normalizeText);

  if (filters.maxPrice !== null && (listing.price == null || listing.price > filters.maxPrice)) return false;
  if (filters.minRooms !== null && (listing.rooms == null || listing.rooms < filters.minRooms)) return false;
  if (filters.minArea !== null && (listing.area == null || listing.area < filters.minArea)) return false;

  if (!containsAllRequired(text, requiredKeywords)) return false;
  if (containsBlocked(text, blockedKeywords)) return false;

  // Location filter
  if (!containsAny(text, allowedLocations)) return false;

  // Property type
  if (!containsAny(text, allowedPropertyTypes)) return false;
  if (containsAny(text, blockedPropertyTypes)) return false;

  // Garden / Pool heuristics
  if (filters.requireGarden && !text.includes('jardin')) return false;
  if (filters.requirePool && !text.includes('piscina')) return false;

  return true;
}

module.exports = {
  matchesFilters,
  normalizeText,
};
