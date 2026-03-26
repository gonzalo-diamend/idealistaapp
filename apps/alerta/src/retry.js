const { setTimeout: sleep } = require('timers/promises');

async function withRetry(fn, options = {}) {
  const retries = Number.isFinite(options.retries) ? options.retries : 2;
  const baseDelayMs = Number.isFinite(options.baseDelayMs) ? options.baseDelayMs : 400;
  const onRetry = typeof options.onRetry === 'function' ? options.onRetry : () => {};

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;

      const waitMs = baseDelayMs * 2 ** attempt;
      await onRetry({ attempt: attempt + 1, waitMs, error });
      await sleep(waitMs);
      attempt += 1;
    }
  }

  throw lastError;
}

module.exports = {
  withRetry,
};
