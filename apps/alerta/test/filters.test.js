const test = require('node:test');
const assert = require('node:assert/strict');

const { matchesFilters } = require('../src/filters');

function fullFilters() {
  return {
    maxPrice: 1000,
    minRooms: 2,
    minArea: 60,
    requiredKeywords: ['luminoso'],
    blockedKeywords: ['interior'],
  };
}

test('pasa cuando cumple todos los filtros', () => {
  const listing = {
    price: 900,
    rooms: 2,
    area: 65,
    rawText: 'Piso luminoso con balcón y ascensor',
  };

  assert.equal(matchesFilters(listing, fullFilters()), true);
});

test('falla por maxPrice', () => {
  assert.equal(matchesFilters({ price: 1200, rooms: 2, area: 70, rawText: 'luminoso' }, fullFilters()), false);
});

test('falla por minRooms', () => {
  assert.equal(matchesFilters({ price: 900, rooms: 1, area: 70, rawText: 'luminoso' }, fullFilters()), false);
});

test('falla por minArea', () => {
  assert.equal(matchesFilters({ price: 900, rooms: 2, area: 40, rawText: 'luminoso' }, fullFilters()), false);
});

test('falla si faltan required keywords', () => {
  assert.equal(matchesFilters({ price: 900, rooms: 2, area: 70, rawText: 'con terraza' }, fullFilters()), false);
});

test('falla por blocked keywords presentes', () => {
  assert.equal(matchesFilters({ price: 900, rooms: 2, area: 70, rawText: 'Piso interior luminoso' }, fullFilters()), false);
});

test('normaliza tildes en required/blocked keywords', () => {
  const listing = {
    price: 950,
    rooms: 2,
    area: 70,
    rawText: 'Piso con jardin y piscina',
  };
  const filters = {
    maxPrice: 1000,
    minRooms: 2,
    minArea: 60,
    requiredKeywords: ['JARDÍN'],
    blockedKeywords: ['ÁTICO'],
  };
  assert.equal(matchesFilters(listing, filters), true);
});

test('falla cuando falta dato clave requerido por filtros numéricos', () => {
  const filters = fullFilters();
  assert.equal(matchesFilters({ price: null, rooms: 2, area: 60, rawText: 'luminoso' }, filters), false);
  assert.equal(matchesFilters({ price: 900, rooms: null, area: 60, rawText: 'luminoso' }, filters), false);
  assert.equal(matchesFilters({ price: 900, rooms: 2, area: null, rawText: 'luminoso' }, filters), false);
});
