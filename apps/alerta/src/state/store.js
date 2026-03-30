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
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.seen)) {
      return { seen: [] };
    }
    return parsed;
  } catch {
    return { seen: [] };
  }
}

async function writeState(filePath, state) {
  await ensureFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2));
}

module.exports = {
  readState,
  writeState,
};
