// src/main/core/app-config.js

const { app } = require('electron');
const { ENVIRONMENT, getFeatureFlag } = require('./environment');

/**
 * @typedef {Object} AppConfig
 * @property {string} appName
 * @property {string} version
 * @property {boolean} isDev
 * @property {string} userDataPath
 * @property {Object} window
 * @property {Object} splash
 * @property {Object} features
 * @property {Object} paths
 */

const APP_CONFIG = {
  // === BASIC ===
  appName: 'Meatify',
  version: app.getVersion(),
  isDev: ENVIRONMENT.isDev,
  userDataPath: ENVIRONMENT.paths.userData,
  environment: ENVIRONMENT,

  // === WINDOW CONFIG ===
  window: {
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#ffffff',
    frame: true,
    title: `Meatify v${app.getVersion()}`,
  },

  // === SPLASH CONFIG ===
  splash: {
    width: 500,
    height: 400,
    transparent: true,
    backgroundColor: '#00000000',
  },

  // === FEATURES ===
  features: {
    devTools: getFeatureFlag('enableDevTools', ENVIRONMENT.isDev),
    logging: getFeatureFlag('enableLogging', true),
    autoUpdate: getFeatureFlag('enableAutoUpdate', !ENVIRONMENT.isDev),
    analytics: getFeatureFlag('enableAnalytics', false),
    debugMode: getFeatureFlag('enableDebugMode', ENVIRONMENT.isDev),

    // Meatify-specific
    batchExpiry: getFeatureFlag('enableBatchExpiry', true),
    fifo: getFeatureFlag('enableFIFO', true),
    weightScale: getFeatureFlag('enableWeightScale', false),
  },

  // === PATHS ===
  paths: {
    userData: ENVIRONMENT.paths.userData,
    logs: ENVIRONMENT.paths.logs,
    backups: ENVIRONMENT.paths.backups,
    resources: ENVIRONMENT.paths.resources,
  },

  // === MISC ===
  rendererReadyTimeout: 8000,
};

module.exports = { APP_CONFIG };