// src/utils/retry.js
const { logger } = require("../logger");

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 100)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 5000)
 * @param {string} options.operation - Operation name for logging
 * @param {Function} options.shouldRetry - Custom retry condition (default: ConcurrencyError)
 * @returns {Promise<any>}
 */
async function withRetry(fn, options = {}) {
  const {
    maxAttempts = 3,
    baseDelay = 100,
    maxDelay = 5000,
    operation = "operation",
    shouldRetry = (error) => error.name === "ConcurrencyError",
  } = options;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error)) {
        throw error;
      }

      if (attempt === maxAttempts) {
        logger.error(`[${operation}] Max retries (${maxAttempts}) exceeded`);
        throw error;
      }

      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const jitter = Math.random() * 100;
      const waitTime = delay + jitter;

      logger.warn(
        `[${operation}] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${Math.round(waitTime)}ms`,
        { error: error.message }
      );

      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

module.exports = { withRetry };