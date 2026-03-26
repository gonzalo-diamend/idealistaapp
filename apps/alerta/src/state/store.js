const fs = require('fs/promises');
const path = require('path');

async function ensureFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({ seen: [] }, null, 2));
  }
}

async function readState(filePath) {
  await ensureFile(filePath);
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function writeState(filePath, state) {
  await ensureFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2));
}

module.exports = {
  readState,
  writeState,
};
