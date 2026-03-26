function containsAllRequired(text, requiredKeywords) {
  if (!requiredKeywords.length) return true;
  return requiredKeywords.every((word) => text.includes(word));
}

function containsBlocked(text, blockedKeywords) {
  if (!blockedKeywords.length) return false;
  return blockedKeywords.some((word) => text.includes(word));
}

function matchesFilters(listing, filters) {
  const text = (listing.rawText || '').toLowerCase();

  if (filters.maxPrice !== null && listing.price !== null && listing.price > filters.maxPrice) {
    return false;
  }

  if (filters.minRooms !== null && listing.rooms !== null && listing.rooms < filters.minRooms) {
    return false;
  }

  if (filters.minArea !== null && listing.area !== null && listing.area < filters.minArea) {
    return false;
  }

  if (!containsAllRequired(text, filters.requiredKeywords)) return false;
  if (containsBlocked(text, filters.blockedKeywords)) return false;

  return true;
}

module.exports = {
  matchesFilters,
};
