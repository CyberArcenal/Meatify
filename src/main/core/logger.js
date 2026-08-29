// src/main/core/logger.js

const { app } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const { APP_CONFIG } = require('./app-config');

/** @enum {string} */
const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
};

const COLOR_MAP = {
  [LogLevel.DEBUG]: '\x1b[36m',
  [LogLevel.INFO]: '\x1b[34m',
  [LogLevel.WARN]: '\x1b[33m',
  [LogLevel.ERROR]: '\x1b[31m',
  [LogLevel.SUCCESS]: '\x1b[32m',
};

/**
 * @param {LogLevel} level
 * @param {string} message
 * @param {any} [data]
 * @param {boolean} [writeToFile=false]
 */
async function log(level, message, data = null, writeToFile = false) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${APP_CONFIG.appName} ${level}]`;
  const logMessage = `${prefix} ${message}`;

  // Console output
  if (APP_CONFIG.isDev) {
    const color = COLOR_MAP[level] || '';
    console.log(`${color}${logMessage}\x1b[0m`);
  } else {
    console.log(logMessage);
  }

  if (data) {
    console.dir(data, { depth: 3, colors: APP_CONFIG.isDev });
  }

  // Write to file (production only)
  if (writeToFile && !APP_CONFIG.isDev) {
    try {
      const logDir = path.join(APP_CONFIG.userDataPath, 'logs');
      await fs.mkdir(logDir, { recursive: true });
      
      const logFile = path.join(
        logDir,
        `${APP_CONFIG.appName}-${new Date().toISOString().split('T')[0]}.log`
      );
      const logEntry = `${logMessage}${data ? '\n' + JSON.stringify(data, null, 2) : ''}\n`;
      await fs.appendFile(logFile, logEntry);
    } catch (err) {
      console.error('Failed to write log to file:', err);
    }
  }
}

// Convenience methods
const logger = {
  debug: (msg, data) => log(LogLevel.DEBUG, msg, data),
  info: (msg, data) => log(LogLevel.INFO, msg, data),
  warn: (msg, data) => log(LogLevel.WARN, msg, data),
  error: (msg, data) => log(LogLevel.ERROR, msg, data, true),
  success: (msg, data) => log(LogLevel.SUCCESS, msg, data),
  log,
  LogLevel,
};

module.exports = { logger, LogLevel };