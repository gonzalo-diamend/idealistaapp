const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

const { readState, writeState } = require('../src/state/store');

test('state store crea archivo y persiste datos', async () => {
  const filePath = path.join(os.tmpdir(), `alerta-state-${Date.now()}.json`);

  const initial = await readState(filePath);
  assert.deepEqual(initial, { seen: [] });

  await writeState(filePath, { seen: ['a', 'b'] });
  const stored = await readState(filePath);
  assert.deepEqual(stored, { seen: ['a', 'b'] });

  await fs.unlink(filePath);
});

test('state store tolera JSON inválido devolviendo seen vacío', async () => {
  const filePath = path.join(os.tmpdir(), `alerta-state-invalid-${Date.now()}.json`);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, '{not-json', 'utf8');

  const read = await readState(filePath);
  assert.deepEqual(read, { seen: [] });

  await fs.unlink(filePath);
});
