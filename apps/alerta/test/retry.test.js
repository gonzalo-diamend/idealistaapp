const test = require('node:test');
const assert = require('node:assert/strict');

const { withRetry } = require('../src/retry');

test('withRetry reintenta y finalmente resuelve', async () => {
  let calls = 0;

  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('fallo temporal');
      return 'ok';
    },
    { retries: 3, baseDelayMs: 1 },
  );

  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('withRetry arroja error si supera reintentos', async () => {
  await assert.rejects(
    () => withRetry(async () => Promise.reject(new Error('siempre falla')), { retries: 1, baseDelayMs: 1 }),
    /siempre falla/,
  );
});
