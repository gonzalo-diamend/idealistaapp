const test = require('node:test');
const assert = require('node:assert/strict');

const { formatListingMessage } = require('../src/format');

test('formatListingMessage incluye campos principales', () => {
  const message = formatListingMessage({
    title: 'Piso en Centro',
    price: 1500,
    rooms: 3,
    area: 95,
    url: 'https://www.idealista.com/inmueble/1/',
  });

  assert.match(message, /Piso en Centro/);
  assert.match(message, /(1\.500|1500)/);
  assert.match(message, /3 hab/);
  assert.match(message, /95 m²/);
  assert.match(message, /inmueble\/1/);
});

test('formatListingMessage muestra fallback de precio cuando no existe', () => {
  const message = formatListingMessage({
    title: 'Piso sin precio',
    url: 'https://www.idealista.com/inmueble/2/',
  });

  assert.match(message, /Precio no detectado/);
});
