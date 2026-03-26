const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

const { readState, writeState } = require('../src/state/store');

test('state store crea archivo y persiste datos', async () => {
  const filePath = path.join(os.tmpdir(), `alerta-state-${Date.now()}-${Math.random()}.json`);

  try {
    const initial = await readState(filePath);
    assert.deepEqual(initial, { seen: [] });

    await writeState(filePath, { seen: ['a', 'b'] });
    const stored = await readState(filePath);
    assert.deepEqual(stored, { seen: ['a', 'b'] });
  } finally {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }
  }
});
