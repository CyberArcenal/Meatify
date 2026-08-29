// src/main/core/environment.js

/**
 * Environment configuration module
 * Centralizes all environment detection and configuration
 */

/**
 * @typedef {Object} Environment
 * @property {boolean} isDev - Development mode
 * @property {boolean} isTest - Test mode
 * @property {boolean} isProd - Production mode
 * @property {boolean} isPackaged - App is packaged (production build)
 * @property {string} nodeEnv - NODE_ENV value
 * @property {string} platform - Operating system platform
 * @property {string} arch - CPU architecture
 * @property {Object} paths - Common paths
 * @property {Object} features - Feature flags
 */

// ===================== ENVIRONMENT DETECTION =====================

const { app } = require('electron');
const os = require('os');

/** @type {Environment} */
const ENVIRONMENT = {
  // === Environment modes ===
  isDev: process.env.NODE_ENV === 'development' || !app.isPackaged,
  isTest: process.env.NODE_ENV === 'test',
  isProd: process.env.NODE_ENV === 'production',
  isPackaged: app.isPackaged,
  nodeEnv: process.env.NODE_ENV || 'production',

  // === System info ===
  platform: process.platform,
  arch: process.arch,
  osVersion: os.release(),

  // === Application paths ===
  paths: {
    userData: app.getPath('userData'),
    appData: app.getPath('appData'),
    documents: app.getPath('documents'),
    desktop: app.getPath('desktop'),
    temp: app.getPath('temp'),
    logs: app.getPath('userData') + '/logs',
    backups: app.getPath('userData') + '/backups',
    resources: app.isPackaged ? process.resourcesPath : __dirname,
  },

  // === Feature flags (can be overridden via .env or build args) ===
  features: {
    enableDevTools: process.env.ENABLE_DEVTOOLS !== 'false',
    enableLogging: process.env.ENABLE_LOGGING !== 'false',
    enableAutoUpdate: process.env.ENABLE_AUTO_UPDATE !== 'false',
    enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
    enableDebugMode: process.env.ENABLE_DEBUG === 'true',
    // Meatify-specific features
    enableBatchExpiry: process.env.ENABLE_BATCH_EXPIRY !== 'false',
    enableFIFO: process.env.ENABLE_FIFO !== 'false',
    enableWeightScale: process.env.ENABLE_WEIGHT_SCALE === 'true',
  },

  // === Build info ===
  build: {
    version: app.getVersion(),
    buildNumber: process.env.BUILD_NUMBER || '0',
    commitHash: process.env.COMMIT_HASH || 'unknown',
    buildDate: new Date().toISOString(),
  },
};

// ===================== ENVIRONMENT HELPERS =====================

/**
 * Check if running in development mode with hot reload
 */
function isHotReload() {
  return ENVIRONMENT.isDev && process.env.VITE_DEV_SERVER_URL;
}

/**
 * Get current environment name (for logging)
 */
function getEnvironmentName() {
  if (ENVIRONMENT.isDev) return 'development';
  if (ENVIRONMENT.isTest) return 'test';
  if (ENVIRONMENT.isProd) return 'production';
  return 'unknown';
}

/**
 * Get a feature flag value with optional default
 * @param {string} featureName
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
function getFeatureFlag(featureName, defaultValue = false) {
  return ENVIRONMENT.features[featureName] !== undefined
    ? ENVIRONMENT.features[featureName]
    : defaultValue;
}

/**
 * Get a path by name
 * @param {keyof Environment['paths']} pathName
 * @returns {string}
 */
function getPath(pathName) {
  return ENVIRONMENT.paths[pathName] || '';
}

/**
 * Check if the app is running on Windows
 */
function isWindows() {
  return ENVIRONMENT.platform === 'win32';
}

/**
 * Check if the app is running on macOS
 */
function isMac() {
  return ENVIRONMENT.platform === 'darwin';
}

/**
 * Check if the app is running on Linux
 */
function isLinux() {
  return ENVIRONMENT.platform === 'linux';
}

// ===================== EXPORTS =====================

module.exports = {
  ENVIRONMENT,
  isHotReload,
  getEnvironmentName,
  getFeatureFlag,
  getPath,
  isWindows,
  isMac,
  isLinux,
};