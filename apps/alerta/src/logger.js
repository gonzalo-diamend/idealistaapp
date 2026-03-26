function log(level, event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  };

  const output = JSON.stringify(entry);
  if (level === 'error') {
    console.error(output);
    return;
  }

  console.log(output);
}

module.exports = {
  log,
};
