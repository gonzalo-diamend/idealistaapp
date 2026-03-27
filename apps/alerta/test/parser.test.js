const test = require('node:test');
const assert = require('node:assert/strict');

const { parseListings } = require('../src/providers/idealista');

test('parseListings detecta inmuebles desde fallback HTML', () => {
  const html = `
    <article>
      <a href="/inmueble/12345678/">Piso en Centro</a>
      <span>1.100 €</span>
      <span>3 hab</span>
      <span>80 m²</span>
    </article>
  `;

  const listings = parseListings(html, 'https://www.idealista.com/busqueda');
  assert.equal(listings.length, 1);
  assert.equal(listings[0].price, 1100);
  assert.equal(listings[0].rooms, 3);
  assert.equal(listings[0].area, 80);
});

test('parseListings detecta inmuebles desde JSON-LD', () => {
  const html = `
    <script type="application/ld+json">
      {"itemListElement":[{"item":{"url":"https://www.idealista.com/inmueble/999/","name":"Ático","offers":{"price":"1200"},"numberOfRooms":"2","floorSize":{"value":"70"}}}]}
    </script>
  `;

  const listings = parseListings(html, 'https://www.idealista.com/busqueda');
  assert.equal(listings.length, 1);
  assert.equal(listings[0].url, 'https://www.idealista.com/inmueble/999/');
  assert.equal(listings[0].price, 1200);
});

test('parseListings deduplica por URL entre JSON-LD y HTML', () => {
  const html = `
    <script type="application/ld+json">
      {"itemListElement":[{"item":{"url":"https://www.idealista.com/inmueble/555/","name":"Dúplex","offers":{"price":"2100"}}}]}
    </script>
    <article>
      <a href="/inmueble/555/">Dúplex</a>
      <span>2.100 €</span>
    </article>
  `;

  const listings = parseListings(html, 'https://www.idealista.com/busqueda');
  assert.equal(listings.length, 1);
  assert.equal(listings[0].id, 'https://www.idealista.com/inmueble/555/');
});

test('parseListings ignora JSON-LD inválido sin romper el parseo', () => {
  const html = `
    <script type="application/ld+json">{invalid-json}</script>
    <article>
      <a href="/inmueble/777/">Loft</a>
      <span>1.700 €</span>
    </article>
  `;

  const listings = parseListings(html, 'https://www.idealista.com/busqueda');
  assert.equal(listings.length, 1);
  assert.equal(listings[0].id, 'https://www.idealista.com/inmueble/777/');
});
