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

function matchesFilters(listing, filters) {
  const text = normalizeText(listing.rawText);
  const requiredKeywords = (filters.requiredKeywords || []).map(normalizeText).filter(Boolean);
  const blockedKeywords = (filters.blockedKeywords || []).map(normalizeText).filter(Boolean);

  if (filters.maxPrice !== null && (listing.price === null || listing.price === undefined || listing.price > filters.maxPrice)) {
    return false;
  }

  if (filters.minRooms !== null && (listing.rooms === null || listing.rooms === undefined || listing.rooms < filters.minRooms)) {
    return false;
  }

  if (filters.minArea !== null && (listing.area === null || listing.area === undefined || listing.area < filters.minArea)) {
    return false;
  }

  if (!containsAllRequired(text, requiredKeywords)) return false;
  if (containsBlocked(text, blockedKeywords)) return false;

  return true;
}

module.exports = {
  matchesFilters,
  normalizeText,
};
