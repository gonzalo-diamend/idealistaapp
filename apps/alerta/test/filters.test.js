const test = require('node:test');
const assert = require('node:assert/strict');

const { matchesFilters } = require('../src/filters');

test('matchesFilters respeta reglas de precio y keywords', () => {
  const listing = {
    price: 900,
    rooms: 2,
    area: 65,
    rawText: 'Piso luminoso con balcón y ascensor',
  };

  const filters = {
    maxPrice: 1000,
    minRooms: 2,
    minArea: 60,
    requiredKeywords: ['luminoso'],
    blockedKeywords: ['interior'],
  };

  assert.equal(matchesFilters(listing, filters), true);
});

test('matchesFilters excluye por keyword bloqueada', () => {
  const listing = {
    price: 900,
    rooms: 2,
    area: 65,
    rawText: 'Piso interior con balcón',
  };

  const filters = {
    maxPrice: 1000,
    minRooms: 2,
    minArea: 60,
    requiredKeywords: [],
    blockedKeywords: ['interior'],
  };

  assert.equal(matchesFilters(listing, filters), false);
});

test('matchesFilters no excluye por minRooms/minArea si faltan datos del anuncio', () => {
  const listing = {
    price: 900,
    rooms: null,
    area: null,
    rawText: 'Piso luminoso',
  };

  const filters = {
    maxPrice: 1000,
    minRooms: 2,
    minArea: 60,
    requiredKeywords: ['luminoso'],
    blockedKeywords: [],
  };

  assert.equal(matchesFilters(listing, filters), true);
});
