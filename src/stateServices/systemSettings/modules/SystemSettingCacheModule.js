// src/stateServices/systemSetting/modules/SystemSettingCacheModule.js
const { logger } = require("../../../utils/logger");

// Simple in-memory cache
const settingsCache = {};

/**
 * SystemSettingCacheModule - Handles in-memory caching for system settings.
 */
class SystemSettingCacheModule {
  /**
   * Get a value from cache
   * @param {string} key - The cache key
   * @returns {any} The cached value, or undefined if not found
   */
  get(key) {
    return settingsCache[key];
  }

  /**
   * Set a value in cache
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   */
  set(key, value) {
    settingsCache[key] = value;
    logger.debug(`[Cache] Set ${key} = ${value}`);
  }

  /**
   * Invalidate a cache entry
   * @param {string} key - The cache key
   */
  invalidate(key) {
    delete settingsCache[key];
    logger.debug(`[Cache] Invalidated ${key}`);
  }

  /**
   * Clear all cache
   */
  clear() {
    for (const key of Object.keys(settingsCache)) {
      delete settingsCache[key];
    }
    logger.debug(`[Cache] Cleared all entries`);
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - The cache key
   * @returns {boolean}
   */
  has(key) {
    return settingsCache[key] !== undefined;
  }

  /**
   * Get all cache entries
   * @returns {Object} All cached entries
   */
  getAll() {
    return { ...settingsCache };
  }
}

module.exports = SystemSettingCacheModule;