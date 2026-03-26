function formatListingMessage(listing) {
  const parts = [
    `🏠 ${listing.title}`,
    listing.price ? `💶 ${listing.price.toLocaleString('es-ES')} €` : '💶 Precio no detectado',
    listing.rooms ? `🛏️ ${listing.rooms} hab.` : null,
    listing.area ? `📐 ${listing.area} m²` : null,
    `🔗 ${listing.url}`,
  ].filter(Boolean);

  return parts.join('\n');
}

module.exports = {
  formatListingMessage,
};
