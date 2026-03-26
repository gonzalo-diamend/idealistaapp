const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadEnvFile } = require('../src/env');

test('loadEnvFile carga variables y no pisa existentes', () => {
  const tmpFile = path.join(os.tmpdir(), `alerta-env-${Date.now()}.env`);
  fs.writeFileSync(tmpFile, 'FOO=bar\nBAR=baz\n# comment\n\nINVALID\n');

  process.env.FOO = 'already-set';
  delete process.env.BAR;

  loadEnvFile(tmpFile);

  assert.equal(process.env.FOO, 'already-set');
  assert.equal(process.env.BAR, 'baz');

  fs.unlinkSync(tmpFile);
});
