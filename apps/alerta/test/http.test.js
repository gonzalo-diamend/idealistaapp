const test = require('node:test');
const assert = require('node:assert/strict');

const { fetchWithTimeout } = require('../src/http');

test('fetchWithTimeout delega a fetch con signal', async () => {
  const originalFetch = global.fetch;
  let called = false;

  global.fetch = async (_url, options) => {
    called = true;
    assert.ok(options.signal);
    return { ok: true, text: async () => 'ok' };
  };

  try {
    const response = await fetchWithTimeout('https://example.com', {}, 1000);
    assert.equal(response.ok, true);
    assert.equal(called, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchWithTimeout transforma AbortError en mensaje de timeout', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    throw err;
  };

  try {
    await assert.rejects(() => fetchWithTimeout('https://example.com', {}, 10), /Timeout alcanzado/);
  } finally {
    global.fetch = originalFetch;
  }
});
